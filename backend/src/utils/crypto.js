const crypto = require('crypto');
const fs = require('fs');

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from('59713d2f939379854746ba1f39c0cc3f59713d2f939379854746ba1f39c0cc3f', 'hex'); // Fixed key for local dev

async function encryptFile(data, outputPath) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  // Ensure the directory exists
  const path = require('path');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const inputBuffer = Buffer.isBuffer(data) ? data : await fs.promises.readFile(data);
  const encrypted = Buffer.concat([iv, cipher.update(inputBuffer), cipher.final()]);
  
  await fs.promises.writeFile(outputPath, encrypted);
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
