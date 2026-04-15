const express = require('express');
const { prisma } = require('../lib/prisma');

const router = express.Router();

// PATCH /api/pages/:id — update ai_label, rotation, isFlagged
router.patch('/:id', async (req, res) => {
  const { aiLabel, rotation, isFlagged } = req.body;
  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      ...(aiLabel !== undefined && { aiLabel }),
      ...(rotation !== undefined && { rotation }),
      ...(isFlagged !== undefined && { isFlagged }),
    },
  });
  res.json({ success: true, data: page });
});

module.exports = router;
