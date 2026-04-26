const express = require('express');
const { prisma } = require('../lib/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth protection to all routes in this file
router.use(authMiddleware);

// --- USER MANAGEMENT ---

// GET /api/admin/users - List all employees
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { blobs: true, documents: true }
        }
      }
    });
    // Remove passwords before sending
    const safeUsers = users.map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    res.json({ success: true, data: safeUsers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/users/:id - Update user role or status
router.patch('/users/:id', adminMiddleware, async (req, res) => {
  const { role, status, name } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role, status, name }
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/users/:id - Remove user
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- DOCUMENT TEMPLATES (SCHEMA CONFIG) ---

// GET /api/admin/doc-types
router.get('/doc-types', async (req, res) => {
  try {
    const types = await prisma.configuredDocType.findMany({
      orderBy: { label: 'asc' }
    });
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/doc-types - Add new template
router.post('/doc-types', adminMiddleware, async (req, res) => {
  const { code, label, description, isCommon } = req.body;
  try {
    const type = await prisma.configuredDocType.create({
      data: { code, label, description, isCommon }
    });
    res.json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/doc-types/:id
router.delete('/doc-types/:id', adminMiddleware, async (req, res) => {
  try {
    await prisma.configuredDocType.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- STORAGE SETTINGS ---

// GET /api/admin/storage-settings
router.get('/storage-settings', adminMiddleware, async (req, res) => {
  try {
    let settings = await prisma.storageSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.storageSettings.create({ data: { id: 'default' } });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/storage-settings
router.put('/storage-settings', adminMiddleware, async (req, res) => {
  try {
    const data = req.body;
    // Don't update id
    delete data.id;
    delete data.updatedAt;

    const settings = await prisma.storageSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: { ...data }
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
