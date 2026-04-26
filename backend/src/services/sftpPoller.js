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

const { listInboundFiles, downloadFromInbound, moveToArchive } = require('../utils/storage');

async function pollSftp() {
  try {
    const pdfFiles = await listInboundFiles();

    if (pdfFiles.length === 0) {
      return;
    }

    // Get all users to assign blobs to
    const users = await prisma.user.findMany({ where: { status: 'ACTIVE' } });
    if (users.length === 0) {
      logger.warn('No active users found to assign inbound files to.');
      return;
    }

    for (const file of pdfFiles) {
      logger.info(`Found new remote file: ${file.name}`);

      const fileName = `${uuidv4()}-${file.name}`;
      const actualStorageDir = path.join(__dirname, '../../../storage/blobs');
      const filePath = path.join(actualStorageDir, fileName);
      const tempPath = `${filePath}.tmp`;

      // Download file to temp path
      await downloadFromInbound(file.name, tempPath);
      
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
        
        logger.info(`Blob ${blob.id} created for user ${user.id} from remote storage.`);

        // Trigger engine
        try {
          const engineUrl = `${process.env.ENGINE_URL || 'http://localhost:8000'}/process`;
          await axios.post(engineUrl, {
            blob_id: blob.id,
            storage_path: fileName,
          });
        } catch (err) {
          logger.error(`Failed to trigger engine for remote blob ${blob.id}: ${err.message}`);
          await prisma.blob.update({
            where: { id: blob.id },
            data: { status: 'FAILED' },
          });
        }
      }

      // Move to archive to prevent reprocessing
      try {
          await moveToArchive(file.name);
          logger.info(`Moved ${file.name} to Archive.`);
      } catch (err) {
          logger.warn(`Failed to move file to Archive: ${err.message}.`);
      }
    }
  } catch (err) {
    logger.error(`Storage Poller Error: ${err.message}`);
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
