const express = require('express');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');

const router = express.Router();

// GET /api/blobs — list all blobs
router.get('/', async (req, res) => {
  const blobs = await prisma.blob.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { pages: true, documents: true } } },
  });
  res.json({ success: true, data: blobs });
});

// GET /api/blobs/:id — single blob with pages
router.get('/:id', async (req, res) => {
  const blob = await prisma.blob.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      pages: { orderBy: { pageIndex: 'asc' } },
      documents: {
        include: {
          pages: { include: { page: true }, orderBy: { order: 'asc' } },
        },
      },
    },
  });
  res.json({ success: true, data: blob });
});

// PATCH /api/blobs/:id — update status/progress (engine callback)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, progress } = req.body;

  const blob = await prisma.blob.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(progress !== undefined && { progress })
    }
  });

  res.json({ success: true, data: blob });
});

/**
 * POST /api/blobs/:id/pages
 * Called by the Python engine after it finishes exploding a PDF.
 * Optimized: uses bulk createMany + in-memory grouping to minimize DB round-trips.
 */
router.post('/:id/pages', async (req, res) => {
  const { id } = req.params;
  const { pages, status } = req.body;

  if (!pages || pages.length === 0) {
    return res.status(400).json({ success: false, error: 'No pages provided' });
  }

  logger.info(`Engine callback for blob ${id}: ${pages.length} pages, status=${status}`);

  // Sort pages in-memory once (cheap JS sort, not a DB query)
  pages.sort((a, b) => a.page_index - b.page_index);

  try {
    // ─── Phase 1: Fast bulk page write ───────────────────────────────────────
    // For the EXPLODED (initial placeholder) callback we just do a createMany.
    // For the COMPLETED callback we delete stale rows and re-insert with final data.
    // This collapses hundreds of per-page upserts into 2 statements.
    await prisma.$transaction(async (tx) => {
      if (status === 'EXPLODED') {
        // Skip if pages already exist (idempotent early-exit)
        const existing = await tx.page.count({ where: { blobId: id } });
        if (existing === 0) {
          await tx.page.createMany({
            data: pages.map(p => ({
              blobId: id,
              pageIndex: p.page_index,
              s3Path: p.s3_path,
              aiLabel: p.ai_label,
              confidenceScore: p.confidence_score,
              isFlagged: p.is_flagged || false,
              anomalyFlags: p.anomaly_flags,
              extractedData: p.extracted_data,
            })),
            skipDuplicates: true,
          });
        }
        await tx.blob.update({
          where: { id },
          data: { status: 'EXPLODED', pageCount: pages.length },
        });
      } else {
        // COMPLETED path: delete old stubs and bulk-insert final records
        await tx.page.deleteMany({ where: { blobId: id } });
        await tx.page.createMany({
          data: pages.map(p => ({
            blobId: id,
            pageIndex: p.page_index,
            s3Path: p.s3_path,
            aiLabel: p.ai_label,
            confidenceScore: p.confidence_score,
            isFlagged: p.is_flagged || false,
            anomalyFlags: p.anomaly_flags,
            extractedData: p.extracted_data,
          })),
        });
        await tx.blob.update({
          where: { id },
          data: { status: status || 'COMPLETED', pageCount: pages.length, progress: 100 },
        });
      }
    }, { timeout: 30000 }); // Give large batches a longer transaction window

    // ─── Phase 2: Document grouping (COMPLETED only) ─────────────────────────
    // Done OUTSIDE the first transaction so it doesn't extend the write lock.
    if (status !== 'EXPLODED') {
      // Fetch all freshly-inserted pages in one query
      const insertedPages = await prisma.page.findMany({
        where: { blobId: id },
        orderBy: { pageIndex: 'asc' },
        select: { id: true, pageIndex: true, aiLabel: true },
      });

      logger.info(`Phase 2: Found ${insertedPages.length} inserted pages for blob ${id}`);

      const blobData = await prisma.blob.findUnique({ where: { id }, select: { userId: true } });

      // Delete any previously auto-created documents for this blob (clean slate on retry)
      await prisma.document.deleteMany({ where: { blobId: id } });

      // Group consecutive same-label pages in memory
      const docGroups = [];
      let currentLabel = null;
      let currentGroup = null;

      for (const page of insertedPages) {
        const label = page.aiLabel || 'UNCLASSIFIED';
        if (label !== currentLabel) {
          currentLabel = label;
          currentGroup = { label, pageIds: [] };
          docGroups.push(currentGroup);
        }
        currentGroup.pageIds.push(page.id);
      }

      logger.info(`Phase 2: Created ${docGroups.length} document groups`);

      // Create each document group and its DocumentPage links in one pass
      for (const group of docGroups) {
        const doc = await prisma.document.create({
          data: {
            userId: blobData.userId,
            blobId: id,
            name: `${group.label} Package`,
            documentType: group.label,
            status: 'AI_CLASSIFIED',
          },
        });
        logger.info(`Phase 2: Created document ${doc.id} for label ${group.label}`);
        
        const dpData = group.pageIds.map((pid, order) => ({
          documentId: doc.id,
          pageId: pid,
          order,
        }));
        
        const count = await prisma.documentPage.createMany({
          data: dpData,
          skipDuplicates: true,
        });
        logger.info(`Phase 2: Created ${count.count} document_pages for document ${doc.id}`);
      }

      await prisma.auditLog.create({
        data: {
          blobId: id,
          action: 'ENGINE_PROCESSED',
          payload: JSON.stringify({ pagesCreated: pages.length, status: status || 'COMPLETED' }),
          performedBy: 'ai-engine',
        },
      });
    }

    res.json({ success: true, pagesCreated: pages.length });
  } catch (err) {
    logger.error(`Failed to process engine callback: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/blobs/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const blob = await prisma.blob.findUnique({
      where: { id },
      include: { pages: true }
    });
    
    if (!blob) return res.status(404).json({ success: false, message: 'Blob not found' });

    // 1. Delete files from disk
    const blobsDir = path.join(__dirname, '../../../storage/blobs');
    const pagesDir = path.join(__dirname, '../../../storage/pages');
    
    // PDF
    const pdfPath = path.join(blobsDir, blob.s3Path);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    
    // Pages
    for (const page of blob.pages) {
      const pagePath = path.join(pagesDir, page.s3Path);
      if (fs.existsSync(pagePath)) fs.unlinkSync(pagePath);
    }

    // 2. Delete from DB
    await prisma.blob.delete({ where: { id } });

    res.json({ success: true, message: 'Blob and files deleted successfully' });
  } catch (err) {
    logger.error(`Failed to delete blob: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
