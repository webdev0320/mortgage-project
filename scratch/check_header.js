const fs = require('fs');
const blobId = "55238aa7-34c4-41b0-bf49-f44242154376-test.pdf";
const path = `storage/blobs/${blobId}`;
if (fs.existsSync(path)) {
  const buf = fs.readFileSync(path);
  console.log("Encrypted:", buf.slice(0, 32));
}
