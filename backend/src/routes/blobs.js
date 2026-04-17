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

/**
 * POST /api/blobs/:id/pages
 * Called by the Python engine after it finishes exploding a PDF.
 */
router.post('/:id/pages', async (req, res) => {
  const { id } = req.params;
  const { pages, status } = req.body;

  logger.info(`Engine callback for blob ${id}: ${pages.length} pages, status=${status}`);

  try {
    await prisma.$transaction(async (tx) => {
      // Upsert each page
      for (const p of pages) {
        await tx.page.upsert({
          where: { blobId_pageIndex: { blobId: id, pageIndex: p.page_index } },
          create: {
            blobId: id,
            pageIndex: p.page_index,
            s3Path: p.s3_path,
            aiLabel: p.ai_label,
            confidenceScore: p.confidence_score,
            isFlagged: p.is_flagged || false,
            anomalyFlags: p.anomaly_flags,
            extractedData: p.extracted_data,
          },
          update: {
            s3Path: p.s3_path,
            aiLabel: p.ai_label,
            confidenceScore: p.confidence_score,
            isFlagged: p.is_flagged || false,
            anomalyFlags: p.anomaly_flags,
            extractedData: p.extracted_data,
          },
        });
      }

      // Update blob status and page count
      await tx.blob.update({
        where: { id },
        data: {
          status: status || 'COMPLETED',
          pageCount: pages.length,
        },
      });

      // Sort pages to ensure we process them in consecutive order
      pages.sort((a, b) => a.page_index - b.page_index);

      let currentDoc = null;
      let currentLabel = null;
      let orderCounter = 0;

      // Auto-create Documents dynamically (group consecutive pages of the same type)
      const blobData = await tx.blob.findUnique({ where: { id } });
      
      for (const p of pages) {
        const page = await tx.page.findUnique({
          where: { blobId_pageIndex: { blobId: id, pageIndex: p.page_index } },
        });
        if (!page) continue;

        // Check if a document already exists for this page to avoid duplicates on retry
        const existingDP = await tx.documentPage.findFirst({ where: { pageId: page.id } });
        if (existingDP) continue;

        // If the label changes, create a new logical document
        if (p.ai_label !== currentLabel) {
          currentLabel = p.ai_label;
          orderCounter = 0;
          currentDoc = await tx.document.create({
            data: {
              userId: blobData.userId,
              blobId: id,
              name: `${currentLabel || 'Document'} Package`,
              documentType: currentLabel || 'Unknown',
              status: 'AI_CLASSIFIED',
            },
          });
        }

        // Attach page to the current active document
        if (currentDoc) {
          await tx.documentPage.create({
            data: { documentId: currentDoc.id, pageId: page.id, order: orderCounter++ },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          blobId: id,
          action: 'ENGINE_PROCESSED',
          payload: JSON.stringify({ pagesCreated: pages.length, status: status || 'COMPLETED' }),
          performedBy: 'ai-engine'
        }
      });
    });

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
