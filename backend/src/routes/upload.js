const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');
const { encryptFile } = require('../utils/crypto');

const router = express.Router();

// Local storage configuration
const storageDir = path.join(__dirname, '../../../storage/blobs');

const upload = multer({
  storage: multer.memoryStorage(), // Still use memory for multer, but save manually to disk
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

/**
 * POST /api/upload
 * Accepts a PDF, saves it to local disk, creates a Blob record,
 * then fires the Python engine to explode pages.
 */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const fileName = `${uuidv4()}-${req.file.originalname}`;
  const filePath = path.join(storageDir, fileName);

  logger.info(`Saving blob locally: ${filePath}`);

  try {
    // 1. Save and Encrypt the PDF to local storage
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, req.file.buffer);
    await encryptFile(tempPath, filePath);
    await fs.unlink(tempPath); // Delete unencrypted temp file
    
    logger.info(`Blob encrypted and stored at ${filePath}`);

    // 2. Create Blob record in DB
    if (!req.user || !req.user.id) {
       logger.error('Upload attempted without valid user session');
       return res.status(401).json({ success: false, message: 'User session required' });
    }

    const blob = await prisma.blob.create({
      data: {
        userId: req.user.id,
        filename: req.file.originalname,
        s3Path: fileName,
        status: 'PROCESSING',
      },
    });
    
    logger.info(`Blob ${blob.id} created for user ${req.user.id}. Starting engine...`);

    logger.info(`Blob DB record created: ${blob.id}`);

    // 3. Respond immediately to client
    res.status(202).json({
      success: true,
      message: 'Upload accepted. Processing started.',
      blob,
    });

    // 4. Trigger Python engine
    try {
      const engineUrl = `${process.env.ENGINE_URL}/process`;
      await axios.post(engineUrl, {
        blob_id: blob.id,
        storage_path: fileName, // Use local filename
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
    logger.error(`File saving failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to save file' });
  }
});

module.exports = router;
