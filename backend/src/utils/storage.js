const { prisma } = require('../lib/prisma');
const Client = require('ssh2-sftp-client');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

async function getStorageConfig() {
  let settings = await prisma.storageSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = {
      provider: 'SFTP',
      sftpHost: process.env.SFTP_HOST,
      sftpPort: parseInt(process.env.SFTP_PORT || '22'),
      sftpUser: process.env.SFTP_USERNAME,
      sftpPass: process.env.SFTP_PASSWORD
    };
  }
  return settings;
}

function getS3Client(settings) {
  return new S3Client({
    region: settings.s3Region || 'us-east-1',
    credentials: {
      accessKeyId: settings.s3AccessKey,
      secretAccessKey: settings.s3SecretKey,
    }
  });
}

/** Helper to convert S3 stream to buffer */
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/** Uploads a file buffer to the remote Inbound folder */
async function uploadToInbound(filename, buffer) {
  const settings = await getStorageConfig();

  if (settings.provider === 'S3') {
    if (!settings.s3Bucket || !settings.s3AccessKey) throw new Error('S3 credentials missing');
    const s3 = getS3Client(settings);
    await s3.send(new PutObjectCommand({
      Bucket: settings.s3Bucket,
      Key: `Inbound/${filename}`,
      Body: buffer
    }));
  } else {
    // SFTP
    if (!settings.sftpHost || !settings.sftpUser) throw new Error('SFTP credentials missing');
    const sftp = new Client();
    await sftp.connect({
      host: settings.sftpHost,
      port: settings.sftpPort,
      username: settings.sftpUser,
      password: settings.sftpPass
    });
    
    const inboundExists = await sftp.exists('/Inbound');
    if (!inboundExists) await sftp.mkdir('/Inbound', true);

    await sftp.put(buffer, `/Inbound/${filename}`);
    await sftp.end();
  }
}

/** Lists files in the remote Inbound folder */
async function listInboundFiles() {
  const settings = await getStorageConfig();

  if (settings.provider === 'S3') {
    if (!settings.s3Bucket || !settings.s3AccessKey) throw new Error('S3 credentials missing');
    const s3 = getS3Client(settings);
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: settings.s3Bucket,
      Prefix: 'Inbound/'
    }));
    
    if (!data.Contents) return [];
    
    return data.Contents
      .filter(item => item.Key !== 'Inbound/' && item.Key.toLowerCase().endsWith('.pdf'))
      .map(item => ({ name: item.Key.replace('Inbound/', ''), type: '-' }));
  } else {
    if (!settings.sftpHost || !settings.sftpUser) throw new Error('SFTP credentials missing');
    const sftp = new Client();
    await sftp.connect({
      host: settings.sftpHost,
      port: settings.sftpPort,
      username: settings.sftpUser,
      password: settings.sftpPass
    });

    const inboundExists = await sftp.exists('/Inbound');
    if (!inboundExists) {
      await sftp.end();
      return [];
    }

    const files = await sftp.list('/Inbound');
    await sftp.end();
    return files.filter(f => f.type === '-' && f.name.toLowerCase().endsWith('.pdf'));
  }
}

/** Downloads a file from remote Inbound folder to a local path */
async function downloadFromInbound(filename, localPath) {
  const settings = await getStorageConfig();
  const fs = require('fs/promises');

  if (settings.provider === 'S3') {
    const s3 = getS3Client(settings);
    const data = await s3.send(new GetObjectCommand({
      Bucket: settings.s3Bucket,
      Key: `Inbound/${filename}`
    }));
    const buffer = await streamToBuffer(data.Body);
    await fs.writeFile(localPath, buffer);
  } else {
    const sftp = new Client();
    await sftp.connect({
      host: settings.sftpHost,
      port: settings.sftpPort,
      username: settings.sftpUser,
      password: settings.sftpPass
    });
    await sftp.fastGet(`/Inbound/${filename}`, localPath);
    await sftp.end();
  }
}

/** Moves a file from Inbound to Archive on the remote server */
async function moveToArchive(filename) {
  const settings = await getStorageConfig();

  if (settings.provider === 'S3') {
    // S3 does not have a "rename" command, we must copy then delete.
    const s3 = getS3Client(settings);
    const { CopyObjectCommand } = require('@aws-sdk/client-s3');
    
    await s3.send(new CopyObjectCommand({
      Bucket: settings.s3Bucket,
      CopySource: `${settings.s3Bucket}/Inbound/${filename}`,
      Key: `Archive/${filename}`
    }));
    
    await s3.send(new DeleteObjectCommand({
      Bucket: settings.s3Bucket,
      Key: `Inbound/${filename}`
    }));
  } else {
    const sftp = new Client();
    await sftp.connect({
      host: settings.sftpHost,
      port: settings.sftpPort,
      username: settings.sftpUser,
      password: settings.sftpPass
    });
    
    const archiveExists = await sftp.exists('/Archive');
    if (!archiveExists) await sftp.mkdir('/Archive', true);

    await sftp.rename(`/Inbound/${filename}`, `/Archive/${filename}`);
    await sftp.end();
  }
}

/** Deletes a file from the remote Inbound folder */
async function deleteFromInbound(filename) {
  const settings = await getStorageConfig();

  if (settings.provider === 'S3') {
    const s3 = getS3Client(settings);
    await s3.send(new DeleteObjectCommand({
      Bucket: settings.s3Bucket,
      Key: `Inbound/${filename}`
    }));
  } else {
    const sftp = new Client();
    await sftp.connect({
      host: settings.sftpHost,
      port: settings.sftpPort,
      username: settings.sftpUser,
      password: settings.sftpPass
    });
    await sftp.delete(`/Inbound/${filename}`);
    await sftp.end();
  }
}

module.exports = {
  getStorageConfig,
  uploadToInbound,
  listInboundFiles,
  downloadFromInbound,
  moveToArchive,
  deleteFromInbound
};
