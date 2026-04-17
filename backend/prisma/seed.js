const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // 1. Seed Admin
  const adminEmail = 'admin@idp.local';
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin user seeded: admin@idp.local / admin123');

  // 2. Seed Doc Types
  const types = [
    { code: 'W2', label: 'Income: IRS Form W-2', description: 'Standard annual wage and tax statement.' },
    { code: 'TAX_1040', label: 'Income: IRS Form 1040', description: 'Individual Income Tax Return (2-page standard).' },
    { code: 'PAYSTUB', label: 'Income: Standard Paystub', description: 'Generic layout for earnings (Earnings, Deductions, YTD).' },
    { code: '1099_MISC', label: 'Income: Form 1099-MISC/NEC', description: 'Non-employee compensation for contractors.' },
    { code: 'BANK_STMT', label: 'Assets: Standard Bank Statement', description: '3-column layout (Date, Description, Amount).' },
    { code: 'ASSET_INV', label: 'Assets: Investment/401(k) Summary', description: 'Quarterly asset valuation reports.' },
    { code: 'ID_DL', label: "Identity: State Driver's License", description: "Horizontal/Vertical ID card layout." },
    { code: 'ID_SSN', label: 'Identity: Social Security Card', description: 'Standard blue/white government issued card.' },
    { code: 'ID_PASSPORT', label: 'Identity: US Passport', description: 'Identification page layout.' },
    { code: 'PROP_1003', label: 'Property: Uniform Residential App', description: 'Form 1003 (The primary loan application).' },
    { code: 'PROP_PURCHASE', label: 'Property: Purchase Agreement', description: 'Multi-page sales contract template.' },
    { code: 'PROP_1004', label: 'Property: Appraisal Report', description: 'Form 1004 (The valuation summary page).' },
    { code: 'PROP_TITLE', label: 'Property: Title Commitment', description: 'Legal schedule of ownership and liens.' },
    { code: 'INS_HOI', label: 'Insurance: HOI Dec Page', description: 'Homeowners Insurance Declaration summary.' },
    { code: 'INS_FLOOD', label: 'Insurance: Flood Determination', description: 'Standard FEMA flood zone certification.' },
    { code: 'LEGAL_GIFT', label: 'Legal: Gift Letter', description: 'Standardized template for "donated" funds.' },
    { code: 'LEGAL_LOE', label: 'Legal: Letter of Explanation', description: 'Template for explaining credit or income gaps.' },
  ];

  console.log('Seeding Comprehensive Mortgage Document Types...');

  for (const t of types) {
    await prisma.configuredDocType.upsert({
      where: { code: t.code },
      update: { label: t.label, description: t.description },
      create: { code: t.code, label: t.label, description: t.description }
    });
  }

  console.log('✅ Comprehensive Seeding Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
