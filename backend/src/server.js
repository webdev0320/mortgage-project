require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { logger } = require('./utils/logger');
const { authMiddleware } = require('./middleware/auth');
const { initSftpPoller } = require('./services/sftpPoller');

const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const blobsRouter = require('./routes/blobs');
const pagesRouter = require('./routes/pages');
const documentsRouter = require('./routes/documents');
const exportRouter = require('./routes/export');
const adminRouter = require('./routes/admin');
const demoRouter = require('./routes/demo');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');

// Middleware
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files from storage
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'idp-backend' }));

// Routes
app.use('/api/auth', authRouter);

// Protected Routes
app.use('/api/upload', authMiddleware, uploadRouter);

// Special case: Allow engine to POST pages and PATCH status without auth (internal callback)
app.use('/api/blobs', (req, res, next) => {
  const isEngineCallback = (req.method === 'POST' && req.path.endsWith('/pages')) || 
                           (req.method === 'PATCH' && /^\/[^\/]+$/.test(req.path));
  if (isEngineCallback) return next();
  return authMiddleware(req, res, next);
}, blobsRouter);

app.use('/api/pages', authMiddleware, pagesRouter);
app.use('/api/documents', authMiddleware, documentsRouter);
app.use('/api/export', authMiddleware, exportRouter);
app.use('/api/admin', adminRouter);
app.use('/api/demo', demoRouter);

// Global error handler
app.use(errorHandler);

// Initialize background services
initSftpPoller();

app.listen(PORT, () => {
  logger.info(`🚀 IDP Backend running on http://localhost:${PORT}`);
});

module.exports = app;
