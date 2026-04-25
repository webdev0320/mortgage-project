const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    console.log(user.id);
  } else {
    const newUser = await prisma.user.create({ data: { email: 'test@test.com', password: 'test', name: 'Test' } });
    console.log(newUser.id);
  }
}
main().finally(() => prisma.$disconnect());
