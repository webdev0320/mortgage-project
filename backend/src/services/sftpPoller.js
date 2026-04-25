const cron = require('node-cron');
const Client = require('ssh2-sftp-client');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');
const { encryptFile } = require('../utils/crypto');

const storageDir = path.join(__dirname, '../../../storage/blobs');

const sftpConfig = {
  host: process.env.SFTP_HOST,
  port: parseInt(process.env.SFTP_PORT || '22'),
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD
};

async function pollSftp() {
  const sftp = new Client();
  try {
    if (!sftpConfig.host || !sftpConfig.username) {
      logger.warn('SFTP credentials missing, skipping polling.');
      return;
    }
    
    await sftp.connect(sftpConfig);
    
    // Ensure folders exist
    const inboundExists = await sftp.exists('/Inbound');
    if (!inboundExists) await sftp.mkdir('/Inbound', true);
    
    const archiveExists = await sftp.exists('/Archive');
    if (!archiveExists) await sftp.mkdir('/Archive', true);

    const files = await sftp.list('/Inbound');
    const pdfFiles = files.filter(f => f.type === '-' && f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      await sftp.end();
      return;
    }

    // Get all users to assign blobs to
    const users = await prisma.user.findMany({ where: { status: 'ACTIVE' } });
    if (users.length === 0) {
      logger.warn('No active users found to assign SFTP files to.');
      await sftp.end();
      return;
    }

    for (const file of pdfFiles) {
      const remotePath = `/Inbound/${file.name}`;
      logger.info(`Found new SFTP file: ${file.name}`);

      const fileName = `${uuidv4()}-${file.name}`;
      // Fix storage path depending on backend root, let's make it relative to process.cwd() or proper __dirname
      const actualStorageDir = path.join(__dirname, '../../../storage/blobs');
      const filePath = path.join(actualStorageDir, fileName);
      const tempPath = `${filePath}.tmp`;

      // Download file to temp path
      await sftp.fastGet(remotePath, tempPath);
      
      // Encrypt file
      await encryptFile(tempPath, filePath);
      await fs.unlink(tempPath);

      // Create a blob for EACH user
      for (const user of users) {
        const blob = await prisma.blob.create({
          data: {
            userId: user.id,
            filename: file.name,
            s3Path: fileName,
            status: 'PROCESSING',
          },
        });
        
        logger.info(`Blob ${blob.id} created for user ${user.id} from SFTP.`);

        // Trigger engine
        try {
          const engineUrl = `${process.env.ENGINE_URL || 'http://localhost:8000'}/process`;
          await axios.post(engineUrl, {
            blob_id: blob.id,
            storage_path: fileName,
          });
        } catch (err) {
          logger.error(`Failed to trigger engine for SFTP blob ${blob.id}: ${err.message}`);
          await prisma.blob.update({
            where: { id: blob.id },
            data: { status: 'FAILED' },
          });
        }
      }

      // Move to archive to prevent reprocessing
      const archivePath = `/Archive/${file.name}`;
      try {
          await sftp.rename(remotePath, archivePath);
          logger.info(`Moved ${file.name} to /Archive.`);
      } catch (err) {
          logger.warn(`Failed to move file to Archive: ${err.message}. Attempting to delete instead.`);
          await sftp.delete(remotePath);
      }
    }

    await sftp.end();
  } catch (err) {
    logger.error(`SFTP Poller Error: ${err.message}`);
    try { await sftp.end(); } catch (e) {}
  }
}

function initSftpPoller() {
  // Poll every minute
  cron.schedule('* * * * *', () => {
    logger.info('Running SFTP inbound poll...');
    pollSftp();
  });
  logger.info('SFTP Poller initialized.');
}

module.exports = { initSftpPoller };
