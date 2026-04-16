require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const { logger } = require('./utils/logger');
const uploadRouter = require('./routes/upload');
const blobsRouter = require('./routes/blobs');
const pagesRouter = require('./routes/pages');
const documentsRouter = require('./routes/documents');
const exportRouter = require('./routes/export');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve static files from storage
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'idp-backend' }));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/blobs', blobsRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/export', exportRouter);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 IDP Backend running on http://localhost:${PORT}`);
});

module.exports = app;
