const crypto = require('crypto');
const fs = require('fs');

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from('59713d2f939379854746ba1f39c0cc3f59713d2f939379854746ba1f39c0cc3f', 'hex'); // Fixed key for local dev

function encryptFile(data, outputPath) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  // Ensure the directory exists
  const dir = require('path').dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const output = fs.createWriteStream(outputPath);
  output.write(iv);
  
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(data)) {
      // If it's a buffer, write it through the cipher
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      output.write(encrypted);
      output.end();
    } else {
      // If it's a path, stream it
      const input = fs.createReadStream(data);
      input.pipe(cipher).pipe(output);
    }
    
    output.on('finish', () => resolve());
    output.on('error', (err) => reject(err));
  });
}

function decryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    
    // Read the IV first
    let iv;
    input.once('readable', () => {
      iv = input.read(16);
      if (!iv) return reject(new Error('Failed to read IV'));
      
      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
      const output = fs.createWriteStream(outputPath);
      
      input.pipe(decipher).pipe(output);
      output.on('finish', () => resolve());
      output.on('error', (err) => reject(err));
    });
  });
}

module.exports = { encryptFile, decryptFile };
