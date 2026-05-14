require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
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
const jurisdictionRulesRoutes = require('./routes/jurisdictionRules');

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
app.use('/api/jurisdiction-rules', jurisdictionRulesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-agentic-compliance-monitoring', require('./routes/customFeat01_AgenticComplianceMonitoring'));
app.use('/api/cf-multi-document-correlation', require('./routes/customFeat02_MultiDocumentCorrelation'));
app.use('/api/cf-e-signature-integration', require('./routes/customFeat03_ESignatureIntegration'));
app.use('/api/cf-video-attestation', require('./routes/customFeat04_VideoAttestation'));
app.use('/api/cf-notary-marketplace', require('./routes/customFeat05_NotaryMarketplace'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-witnesses-tracked-but-no-witness', require('./routes/gapFeat_witnesses_tracked_but_no_witness'));
app.use('/api/gap-payments-recorded-but-no-fee', require('./routes/gapFeat_payments_recorded_but_no_fee'));
app.use('/api/gap-clients-exist-without-client', require('./routes/gapFeat_clients_exist_without_client'));
app.use('/api/gap-no-template', require('./routes/gapFeat_no_template'));
app.use('/api/gap-limited-e', require('./routes/gapFeat_limited_e'));
app.use('/api/gap-no-background-check-service-connector-for-identity', require('./routes/gapFeat_no_background_check_service_connector_for_identity'));
app.use('/api/gap-no-bulk-import-of-documents-pdf-batch-processing', require('./routes/gapFeat_no_bulk_import_of_documents_pdf_batch_processing'));
app.use('/api/gap-limited-integration-with-state-notary-boards-no-li', require('./routes/gapFeat_limited_integration_with_state_notary_boards_no_li'));
app.use('/api/gap-no-webhooks-for-external-triggers-e-g-new-client-c', require('./routes/gapFeat_no_webhooks_for_external_triggers_e_g_new_client_c'));
app.use('/api/gap-no-mobile', require('./routes/gapFeat_no_mobile'));

app.listen(PORT, () => {
  console.log(`AI Notary Backend running on port ${PORT}`);
});

module.exports = app;
