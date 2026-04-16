const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// POST /api/documents/split — split pages into a new document
router.post('/split', async (req, res) => {
  const { blobId, pageIds, documentType, name } = req.body;

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        blobId,
        name: name || `Split Document`,
        documentType,
        status: 'AI_CLASSIFIED',
      },
    });

    await tx.documentPage.createMany({
      data: pageIds.map((pageId, idx) => ({
        documentId: doc.id,
        pageId,
        order: idx,
      })),
    });

    await tx.auditLog.create({
      data: {
        blobId,
        documentId: doc.id,
        action: 'SPLIT',
        payload: JSON.stringify({ pageIds, documentType }),
      },
    });

    return doc;
  });

  res.status(201).json({ success: true, data: document });
});

// POST /api/documents/merge — merge two documents into one
router.post('/merge', async (req, res) => {
  const { sourceDocumentId, targetDocumentId, blobId } = req.body;

  await prisma.$transaction(async (tx) => {
    // Get source pages
    const sourcePages = await tx.documentPage.findMany({
      where: { documentId: sourceDocumentId },
      orderBy: { order: 'asc' },
    });

    // Get current max order in target
    const targetPages = await tx.documentPage.findMany({
      where: { documentId: targetDocumentId },
      orderBy: { order: 'asc' },
    });
    const maxOrder = targetPages.length ? targetPages[targetPages.length - 1].order : -1;

    // Re-parent source pages to target
    for (let i = 0; i < sourcePages.length; i++) {
      await tx.documentPage.update({
        where: { id: sourcePages[i].id },
        data: { documentId: targetDocumentId, order: maxOrder + 1 + i },
      });
    }

    // Delete the now-empty source document
    await tx.document.delete({ where: { id: sourceDocumentId } });

    await tx.auditLog.create({
      data: {
        blobId,
        documentId: targetDocumentId,
        action: 'MERGE',
        payload: JSON.stringify({ sourceDocumentId, targetDocumentId }),
      },
    });
  });

  const merged = await prisma.document.findUnique({
    where: { id: targetDocumentId },
    include: { pages: { include: { page: true }, orderBy: { order: 'asc' } } },
  });

  res.json({ success: true, data: merged });
});

// PATCH /api/documents/:id/verify — mark document as human verified
router.patch('/:id/verify', async (req, res) => {
  const { documentType, name, blobId } = req.body;
  const doc = await prisma.$transaction(async (tx) => {
    const updated = await tx.document.update({
      where: { id: req.params.id },
      data: {
        status: 'HUMAN_VERIFIED',
        ...(documentType && { documentType }),
        ...(name && { name }),
      },
      include: { pages: { include: { page: true } } }
    });

    // Recording corrections for the feedback loop
    if (documentType) {
      for (const dp of updated.pages) {
        if (dp.page.aiLabel !== documentType) {
          await tx.classificationCorrection.create({
            data: {
              blobId: updated.blobId,
              originalAiLabel: dp.page.aiLabel || 'UNKNOWN',
              finalHumanLabel: documentType,
              pageThumbnailPath: dp.page.s3Path
            }
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        blobId: blobId || updated.blobId,
        documentId: updated.id,
        action: 'VERIFY',
        payload: JSON.stringify({ documentType, name }),
      },
    });

    return updated;
  });

  res.json({ success: true, data: doc });
});

// PATCH /api/documents/:id/rename
router.patch('/:id/rename', async (req, res) => {
  const { name, documentType, blobId } = req.body;
  const doc = await prisma.$transaction(async (tx) => {
    const updated = await tx.document.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(documentType && { documentType }),
      },
    });

    await tx.auditLog.create({
      data: {
        blobId: blobId || updated.blobId,
        documentId: updated.id,
        action: 'RENAME',
        payload: JSON.stringify({ name, documentType }),
      },
    });

    return updated;
  });

  res.json({ success: true, data: doc });
});

module.exports = router;
