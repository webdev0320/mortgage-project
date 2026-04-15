const express = require('express');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/blobs/:id/pages
 * Called by the Python engine after it finishes exploding a PDF.
 * Persists all Page records and updates Blob status.
 */
router.post('/:id/pages', async (req, res) => {
  const { id } = req.params;
  const { pages, status } = req.body;

  logger.info(`Engine callback for blob ${id}: ${pages.length} pages, status=${status}`);

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
        },
        update: {
          s3Path: p.s3_path,
          aiLabel: p.ai_label,
          confidenceScore: p.confidence_score,
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

    // Auto-create one Document per page (AI initial classification)
    for (const p of pages) {
      const page = await tx.page.findUnique({
        where: { blobId_pageIndex: { blobId: id, pageIndex: p.page_index } },
      });
      if (!page) continue;

      const doc = await tx.document.create({
        data: {
          blobId: id,
          name: `${p.ai_label} (p.${p.page_index + 1})`,
          documentType: p.ai_label,
          status: 'AI_CLASSIFIED',
        },
      });

      await tx.documentPage.create({
        data: { documentId: doc.id, pageId: page.id, order: 0 },
      });
    }
  });

  res.json({ success: true, pagesCreated: pages.length });
});

// GET /api/blobs — re-export top-level list (mounted separately, this file is for /:id sub-routes)
module.exports = router;
