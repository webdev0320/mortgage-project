const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// GET /api/blobs — list all blobs
router.get('/', async (_req, res) => {
  const blobs = await prisma.blob.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { pages: true, documents: true } } },
  });
  res.json({ success: true, data: blobs });
});

// GET /api/blobs/:id — single blob with pages
router.get('/:id', async (req, res) => {
  const blob = await prisma.blob.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      pages: { orderBy: { pageIndex: 'asc' } },
      documents: {
        include: {
          pages: { include: { page: true }, orderBy: { order: 'asc' } },
        },
      },
    },
  });
  res.json({ success: true, data: blob });
});

module.exports = router;
