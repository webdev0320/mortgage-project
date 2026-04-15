const express = require('express');
const { prisma } = require('../lib/prisma');
const { logger } = require('../utils/logger');

const router = express.Router();

// ── Users ──

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (err) {
    logger.error(`Failed to fetch users: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', async (req, res) => {
  const { email, name, role } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, name, role: role || 'OPERATOR' }
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    logger.error(`Failed to create user: ${err.message}`);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user status or role
 */
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status, role }
    });
    res.json({ success: true, data: user });
  } catch (err) {
    logger.error(`Failed to update user: ${err.message}`);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Document Types ──

/**
 * GET /api/admin/document-types
 * List configured doc types
 */
router.get('/document-types', async (req, res) => {
  try {
    const types = await prisma.configuredDocType.findMany({
      orderBy: { label: 'asc' }
    });
    res.json({ success: true, data: types });
  } catch (err) {
    logger.error(`Failed to fetch doc types: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/document-types
 * Create a new configured doc type
 */
router.post('/document-types', async (req, res) => {
  const { code, label, description, isCommon } = req.body;
  logger.info(`Attempting to create doc type: ${JSON.stringify(req.body)}`);
  try {
    const type = await prisma.configuredDocType.create({
      data: { 
        code: code || `CODE_${Date.now()}`, 
        label: label || 'Unnamed Type', 
        description: description || '',
        isCommon: !!isCommon 
      }
    });
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    logger.error(`Failed to create doc type: ${err.message}`, { stack: err.stack, body: req.body });
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/admin/document-types/:id
 */
router.delete('/document-types/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.configuredDocType.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    logger.error(`Failed to delete doc type: ${err.message}`);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
