const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');
const { encryptFile } = require('../utils/crypto');

const router = express.Router();

const demoDir = path.join(__dirname, '../../../demo_file');
const storageDir = path.join(__dirname, '../../../storage/blobs');

/**
 * GET /api/demo/files
 * Lists all PDF files in the local demo_file directory.
 */
router.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(demoDir);
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const details = await Promise.all(pdfs.map(async f => {
      const stats = await fs.stat(path.join(demoDir, f));
      return { 
        name: f, 
        size: stats.size, 
        createdAt: stats.birthtime 
      };
    }));
    res.json({ success: true, data: details });
  } catch (err) {
    logger.warn(`Could not read demo_file dir: ${err.message}`);
    res.json({ success: true, data: [] });
  }
});

/**
 * POST /api/demo/ingest
 * Copies a file from demo_file to storage/blobs, encrypts it, and starts processing.
 */
router.post('/ingest', async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required' });
  }

  const sourcePath = path.join(demoDir, filename);
  const blobName = `${uuidv4()}-${filename}`;
  const targetPath = path.join(storageDir, blobName);

  try {
    // 1. Check if source exists
    try {
      await fs.access(sourcePath);
    } catch (e) {
      return res.status(404).json({ success: false, message: 'Source file not found in demo_file' });
    }

    // 2. Encrypt and "copy" to local storage
    logger.info(`Ingesting local file: ${sourcePath} -> ${targetPath}`);
    await encryptFile(sourcePath, targetPath);

    // 3. Create Blob record in DB
    const blob = await prisma.blob.create({
      data: {
        userId: req.user ? req.user.id : "cmo1l86r00000j6fv93mikuvm",
        filename: filename,
        s3Path: blobName,
        status: 'PROCESSING',
        progress: 0,
      },
    });

    // 4. Trigger Python engine
    const engineUrl = `${process.env.ENGINE_URL}/process`;
    axios.post(engineUrl, {
      blob_id: blob.id,
      storage_path: blobName,
    }).catch(err => {
      logger.error(`Failed to trigger engine for ingested blob ${blob.id}: ${err.message}`);
    });

    res.json({ 
      success: true, 
      message: 'Local file ingested successfully. Processing started.',
      blob 
    });
  } catch (err) {
    logger.error(`Local ingest failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to ingest local file' });
  }
});

module.exports = router;
