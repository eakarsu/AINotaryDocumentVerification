require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const notarizationRoutes = require('./routes/notarizations');
const identityVerificationRoutes = require('./routes/identityVerifications');
const fraudDetectionRoutes = require('./routes/fraudDetections');
const signatureRoutes = require('./routes/signatures');
const clientRoutes = require('./routes/clients');
const templateRoutes = require('./routes/templates');
const auditTrailRoutes = require('./routes/auditTrail');
const paymentRoutes = require('./routes/payments');
const aiAnalysesRoutes = require('./routes/aiAnalyses');
const complianceCheckRoutes = require('./routes/complianceChecks');
const notaryJournalRoutes = require('./routes/notaryJournal');
const sealRoutes = require('./routes/seals');
const aiRoutes = require('./routes/ai');
const profileRoutes = require('./routes/profile');
const reportRoutes = require('./routes/reports');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const witnessRoutes = require('./routes/witnesses');
const bookmarkRoutes = require('./routes/bookmarks');
const noteRoutes = require('./routes/notes');
const exportRoutes = require('./routes/export');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notarizations', notarizationRoutes);
app.use('/api/identity-verifications', identityVerificationRoutes);
app.use('/api/fraud-detections', fraudDetectionRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai-analyses', aiAnalysesRoutes);
app.use('/api/compliance-checks', complianceCheckRoutes);
app.use('/api/notary-journal', notaryJournalRoutes);
app.use('/api/seals', sealRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/witnesses', witnessRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/export', exportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AI Notary Backend running on port ${PORT}`);
});

module.exports = app;
