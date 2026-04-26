const express = require('express');
const axios = require('axios');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');

const router = express.Router();
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8000';

/**
 * POST /api/export/:blobId
 * Triggers the Python re-assembly engine to create the final stitched PDF.
 */
router.post('/:blobId', async (req, res) => {
  const { blobId } = req.params;

  try {
    // 1. Get blob and all document structures
    const blob = await prisma.blob.findUnique({
      where: { id: blobId },
      include: {
        documents: {
          include: {
            pages: { include: { page: true }, orderBy: { order: 'asc' } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!blob) return res.status(404).json({ success: false, error: 'Blob not found' });

    // 2. Format payload for engine
    // We want the engine to know exactly which JPEGs/PNGs to stitch and in what order
    const manifest = blob.documents.map(doc => ({
      documentId: doc.id,
      documentName: doc.name,
      pages: doc.pages.map(dp => dp.page.s3Path)
    }));

    // 3. Call engine
    const response = await axios.post(`${ENGINE_URL}/export`, {
      blob_id: blobId,
      filename: blob.filename,
      manifest: manifest
    });

    // 4. Update blob status to EXPORTED or similar if needed
    await prisma.auditLog.create({
      data: {
        blobId,
        action: 'EXPORT',
        payload: JSON.stringify({ files: response.data.files }),
        performedBy: 'human'
      }
    });

    res.json({ success: true, files: response.data.files });
  } catch (err) {
    logger.error(`Export failed for ${blobId}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
