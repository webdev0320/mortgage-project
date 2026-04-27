const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { uploadToInbound, listInboundFiles, uploadToRemote } = require('../utils/storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and Image files (PNG, JPG) are allowed'));
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const folder = req.query.folder || 'Inbound';

  try {
    const remoteFileName = `${uuidv4()}-${req.file.originalname}`;
    await uploadToRemote(remoteFileName, req.file.buffer, folder);

    res.status(202).json({
      success: true,
      message: `File uploaded to ${folder} folder.`,
      filename: remoteFileName
    });
  } catch (err) {
    logger.error(`Upload to storage failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to upload file to storage provider' });
  }
});

router.get('/inbound', async (req, res) => {
  try {
    const pdfFiles = await listInboundFiles();
    res.json({ success: true, data: pdfFiles });
  } catch (err) {
    logger.error(`List inbound failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to list inbound files' });
  }
});

module.exports = router;
