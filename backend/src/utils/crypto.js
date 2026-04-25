const crypto = require('crypto');
const fs = require('fs');

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from('59713d2f939379854746ba1f39c0cc3f59713d2f939379854746ba1f39c0cc3f', 'hex'); // Fixed key for local dev

function encryptFile(data, outputPath) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    // Ensure the directory exists
    const path = require('path');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const output = fs.createWriteStream(outputPath);
    
    output.on('error', reject);
    
    // Write IV first, then start piping
    output.write(iv, (err) => {
      if (err) return reject(err);

      if (Buffer.isBuffer(data)) {
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        output.write(encrypted);
        output.end();
      } else {
        const input = fs.createReadStream(data);
        input.on('error', reject);
        
        // Manual pipe logic to ensure cipher is handled correctly
        input.pipe(cipher).pipe(output);
      }
    });
    
    output.on('finish', () => resolve());
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
