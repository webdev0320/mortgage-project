const express = require('express');
const Client = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');
const { getStorageConfig } = require('../utils/storage');

const router = express.Router();

/**
 * GET /api/storage/:folder/:filename
 * Proxies the file from SFTP to the browser.
 */
router.get('/:folder/:filename', async (req, res) => {
  const { folder, filename } = req.params;
  const settings = await getStorageConfig();
  const localPath = path.join('/tmp', filename);

  try {
    if (settings.provider === 'SFTP') {
      const sftp = new Client();
      await sftp.connect({
        host: settings.sftpHost,
        port: settings.sftpPort,
        username: settings.sftpUser,
        password: settings.sftpPass
      });
      
      // Download from SFTP to Vercel's volatile /tmp
      await sftp.fastGet(`/${folder}/${filename}`, localPath);
      await sftp.end();
      
      res.sendFile(localPath, () => {
        // Cleanup /tmp after sending
        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) {}
      });
    } else {
        res.status(400).send('Storage provider not supported for proxying');
    }
  } catch (err) {
    console.error('SFTP Proxy Error:', err);
    res.status(404).send('File not found');
  }
});

module.exports = router;
