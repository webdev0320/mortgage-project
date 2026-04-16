const crypto = require('crypto');
const fs = require('fs');

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from('59713d2f939379854746ba1f39c0cc3f59713d2f939379854746ba1f39c0cc3f', 'hex'); // Fixed key for local dev

function encryptFile(inputPath, outputPath) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  
  // Write IV to the start of the file
  output.write(iv);
  
  return new Promise((resolve, reject) => {
    input.pipe(cipher).pipe(output);
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
