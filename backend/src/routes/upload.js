const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const fss = require('fs'); // sync/stream operations
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');
const { encryptFile } = require('../utils/crypto');

const router = express.Router();

// Local storage configuration
const storageDir = path.join(__dirname, '../../../storage/blobs');

// Stream directly to disk — avoids buffering large PDFs in RAM
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storageDir),
  filename: (_req, file, cb) => cb(null, `tmp-${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

/**
 * POST /api/upload
 * Streams the PDF directly to disk (no RAM buffer), encrypts it,
 * creates a Blob record, then fires the Python engine.
 */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  // multer already saved to disk as a temp file — encrypt it in-place
  const tmpPath  = req.file.path;                                    // e.g. storage/blobs/tmp-<uuid>-foo.pdf
  const fileName = `${uuidv4()}-${req.file.originalname}`;
  const filePath = path.join(storageDir, fileName);

  logger.info(`Encrypting streamed blob to: ${filePath}`);

  try {
    // 1. Encrypt the already-on-disk temp file → final encrypted blob
    await encryptFile(tmpPath, filePath);
    await fs.unlink(tmpPath); // Remove the plaintext temp file

    logger.info(`Blob encrypted and stored at ${filePath}`);

    // 2. Create Blob record in DB
    if (!req.user || !req.user.id) {
      logger.error('Upload attempted without valid user session');
      // Clean up the encrypted file since we cannot continue
      await fs.unlink(filePath).catch(() => {});
      return res.status(401).json({ success: false, message: 'User session required' });
    }

    const blob = await prisma.blob.create({
      data: {
        userId: req.user.id,
        filename: req.file.originalname,
        s3Path: fileName,
        status: 'PROCESSING',
        progress: 0,
      },
    });

    logger.info(`Blob ${blob.id} created. Triggering engine...`);

    // 3. Respond immediately — client gets the blobId to start tracking
    res.status(202).json({
      success: true,
      message: 'Upload accepted. Processing started.',
      blob,
    });

    // 4. Trigger Python engine asynchronously
    try {
      const engineUrl = `${process.env.ENGINE_URL}/process`;
      await axios.post(engineUrl, {
        blob_id: blob.id,
        storage_path: fileName,
      });
      logger.info(`Engine triggered for blob: ${blob.id}`);
    } catch (err) {
      logger.error(`Failed to trigger engine for blob ${blob.id}: ${err.message}`);
      await prisma.blob.update({
        where: { id: blob.id },
        data: { status: 'FAILED' },
      });
    }
  } catch (err) {
    // Clean up any partial files
    await fs.unlink(tmpPath).catch(() => {});
    await fs.unlink(filePath).catch(() => {});
    logger.error(`File saving failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to save file' });
  }
});

module.exports = router;
