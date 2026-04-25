const { encryptFile } = require('./backend/src/utils/crypto');
const fs = require('fs');

async function test() {
  const dummy = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF';
  fs.writeFileSync('dummy.pdf', dummy);
  await encryptFile('dummy.pdf', 'dummy.pdf.enc');
  const bytes = fs.readFileSync('dummy.pdf.enc').slice(0, 5);
  console.log(Array.from(bytes));
}
test();
