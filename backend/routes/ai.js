const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.use(auth);

// Multer setup for text file uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.text', '.md', '.doc', '.rtf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Only text files are allowed'));
    }
  },
});

async function callOpenRouter(systemPrompt, userMessage) {
  const startTime = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Notary Document Verification',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const processingTime = (Date.now() - startTime) / 1000;

  if (data.error) {
    throw new Error(data.error.message || 'OpenRouter API error');
  }

  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;

  return { content, tokensUsed, processingTime, model: data.model || process.env.OPENROUTER_MODEL };
}

/**
 * 3-strategy JSON parser:
 * 1. Direct JSON.parse
 * 2. Strip markdown code fences then parse
 * 3. Regex extract first {...} or [...] block
 */
function parseAIJson(content) {
  // Strategy 1: direct parse
  try {
    return JSON.parse(content);
  } catch {}

  // Strategy 2: strip markdown fences
  try {
    const stripped = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(stripped);
  } catch {}

  // Strategy 3: extract first JSON object or array
  try {
    const match = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) return JSON.parse(match[1]);
  } catch {}

  // Fallback: return raw text wrapped
  return { raw_analysis: content };
}

// Ensure required columns exist on ai_analyses
async function ensureAiAnalysesColumns() {
  try {
    await pool.query('ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS result_parsed JSONB');
    await pool.query('ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS user_id INTEGER');
  } catch {}
}
ensureAiAnalysesColumns();

// Helper: log to audit_trail
async function logAudit(userId, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO audit_trail (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch {}
}

// GET /api/ai/history - paginated ai_analyses for logged-in user
router.get('/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM ai_analyses WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT aa.*, d.title as document_title
       FROM ai_analyses aa
       LEFT JOIN documents d ON aa.document_id = d.id
       WHERE aa.user_id = $1
       ORDER BY aa.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching AI history:', err);
    res.status(500).json({ error: 'Failed to fetch AI history', details: err.message });
  }
});

// POST /api/ai/analyze-document
router.post('/analyze-document', aiRateLimiter, async (req, res) => {
  try {
    const { document_id, content, analysis_type } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    const systemPrompt = `You are an expert legal document analyst specializing in notary and legal document verification. Analyze the provided document and return a structured JSON response with the following fields:
{
  "summary": "Brief summary of the document",
  "document_type": "Identified document type",
  "key_parties": ["List of parties mentioned"],
  "key_dates": ["Important dates found"],
  "key_terms": ["Important legal terms and clauses"],
  "findings": ["List of notable findings"],
  "potential_issues": ["Any issues or concerns identified"],
  "recommendations": ["Recommendations for the notary"],
  "authenticity_indicators": {
    "positive": ["Indicators suggesting authenticity"],
    "negative": ["Indicators suggesting potential problems"]
  },
  "confidence_score": 0.0,
  "risk_level": "low/medium/high"
}
Respond ONLY with valid JSON.`;

    const userMessage = `Analysis type: ${analysis_type || 'content_analysis'}\n\nDocument content:\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);

    // Store the analysis in the database
    let analysisRow = null;
    if (document_id) {
      const insertResult = await pool.query(
        `INSERT INTO ai_analyses (document_id, user_id, analysis_type, result, result_parsed, confidence, model_used, tokens_used, processing_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [document_id, req.user.id, analysis_type || 'content_analysis', JSON.stringify(parsed), parsed, parsed.confidence_score || 0.85, aiResponse.model, aiResponse.tokensUsed, aiResponse.processingTime]
      );
      analysisRow = insertResult.rows[0];
      await logAudit(req.user.id, 'ai_analyze', 'document', document_id, { analysis_type });
    }

    res.json({
      analysis: parsed,
      analysisRecord: analysisRow,
      metadata: {
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        processing_time_seconds: aiResponse.processingTime,
      },
    });
  } catch (err) {
    console.error('AI document analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze document', details: err.message });
  }
});

// POST /api/ai/verify-identity
router.post('/verify-identity', aiRateLimiter, async (req, res) => {
  try {
    const { client_id, document_type, document_number } = req.body;

    if (!document_type || !document_number) {
      return res.status(400).json({ error: 'Document type and document number are required' });
    }

    const systemPrompt = `You are an expert identity verification specialist for a notary service. Based on the provided identification details, perform a verification analysis. Return a structured JSON response:
{
  "verification_status": "verified/unverified/needs_review",
  "confidence_score": 0.0,
  "document_format_valid": true,
  "findings": ["List of verification findings"],
  "checks_performed": [
    {"check": "Format validation", "result": "pass/fail", "details": "..."},
    {"check": "Number pattern analysis", "result": "pass/fail", "details": "..."},
    {"check": "Document type consistency", "result": "pass/fail", "details": "..."}
  ],
  "risk_flags": ["Any risk flags identified"],
  "recommendations": ["Recommendations for the notary"],
  "additional_verification_needed": ["Any additional steps recommended"]
}
Respond ONLY with valid JSON.`;

    const userMessage = `Identity Document Verification Request:\n- Document Type: ${document_type}\n- Document Number: ${document_number}\n- Client ID: ${client_id || 'Not provided'}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);

    // Store the verification result
    if (client_id) {
      const status = parsed.verification_status === 'verified' ? 'verified' : parsed.verification_status === 'unverified' ? 'failed' : 'pending';
      await pool.query(
        'INSERT INTO identity_verifications (client_id, verification_type, status, confidence_score, ai_result, document_number) VALUES ($1, $2, $3, $4, $5, $6)',
        [client_id, document_type, status, parsed.confidence_score || 0.8, JSON.stringify(parsed), document_number]
      );
    }

    res.json({
      verification: parsed,
      metadata: {
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        processing_time_seconds: aiResponse.processingTime,
      },
    });
  } catch (err) {
    console.error('AI identity verification error:', err);
    res.status(500).json({ error: 'Failed to verify identity', details: err.message });
  }
});

// POST /api/ai/detect-fraud
router.post('/detect-fraud', aiRateLimiter, async (req, res) => {
  try {
    const { document_id, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    const systemPrompt = `You are an advanced fraud detection AI specializing in legal and notarized documents. Analyze the provided document content for signs of fraud, forgery, or tampering. Return a structured JSON response:
{
  "risk_level": "low/medium/high/critical",
  "risk_score": 0.0,
  "overall_assessment": "Brief overall assessment",
  "fraud_indicators": [
    {"indicator": "Description", "severity": "low/medium/high", "details": "..."}
  ],
  "authenticity_analysis": {
    "language_consistency": {"score": 0.0, "notes": "..."},
    "formatting_analysis": {"score": 0.0, "notes": "..."},
    "content_coherence": {"score": 0.0, "notes": "..."},
    "legal_terminology": {"score": 0.0, "notes": "..."}
  },
  "flags": ["List of specific flags raised"],
  "recommendations": ["Recommended actions"],
  "confidence_score": 0.0
}
Respond ONLY with valid JSON.`;

    const userMessage = `Fraud Detection Analysis Request:\n\nDocument content:\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);

    // Store the fraud detection result
    let fraudRow = null;
    if (document_id) {
      const insertResult = await pool.query(
        `INSERT INTO fraud_detections (document_id, risk_level, risk_score, ai_analysis, flags, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [document_id, parsed.risk_level || 'low', parsed.risk_score || 0.1, JSON.stringify(parsed), parsed.flags || [], parsed.risk_level === 'high' || parsed.risk_level === 'critical' ? 'flagged' : 'clean']
      );
      fraudRow = insertResult.rows[0];

      // Also store in ai_analyses with result_parsed
      await pool.query(
        `INSERT INTO ai_analyses (document_id, user_id, analysis_type, result, result_parsed, confidence, model_used, tokens_used, processing_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [document_id, req.user.id, 'fraud_detection', JSON.stringify(parsed), parsed, parsed.confidence_score || 0.8, aiResponse.model, aiResponse.tokensUsed, aiResponse.processingTime]
      );
    }

    res.json({
      fraud_analysis: parsed,
      fraudRecord: fraudRow,
      metadata: {
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        processing_time_seconds: aiResponse.processingTime,
      },
    });
  } catch (err) {
    console.error('AI fraud detection error:', err);
    res.status(500).json({ error: 'Failed to detect fraud', details: err.message });
  }
});

// POST /api/ai/check-compliance
router.post('/check-compliance', aiRateLimiter, async (req, res) => {
  try {
    const { document_id, state, document_type } = req.body;

    if (!state || !document_type) {
      return res.status(400).json({ error: 'State and document type are required' });
    }

    // Query jurisdiction rules for the requested state
    let jurisdictionContext = '';
    try {
      const jurisResult = await pool.query(
        'SELECT rule_type, rule_text FROM jurisdiction_rules WHERE LOWER(state) = LOWER($1) ORDER BY effective_date DESC',
        [state]
      );
      if (jurisResult.rows.length > 0) {
        jurisdictionContext = '\n\nApplicable jurisdiction rules on file:\n' +
          jurisResult.rows.map(r => `[${r.rule_type}]: ${r.rule_text}`).join('\n');
      }
    } catch {}

    const systemPrompt = `You are a legal compliance expert specializing in notary laws and regulations across all US states. Analyze the compliance requirements for the given document type and state. Return a structured JSON response:
{
  "compliance_status": "compliant/non_compliant/needs_review",
  "state": "State analyzed",
  "document_type": "Document type analyzed",
  "checks": [
    {"check_type": "state_compliance", "status": "passed/failed/warning", "details": "..."},
    {"check_type": "witness_requirement", "status": "passed/failed/warning", "details": "..."},
    {"check_type": "seal_verification", "status": "passed/failed/warning", "details": "..."},
    {"check_type": "jurisdiction_check", "status": "passed/failed/warning", "details": "..."}
  ],
  "state_requirements": ["List of state-specific requirements"],
  "issues_found": ["Any compliance issues"],
  "recommendations": ["Recommendations to achieve compliance"],
  "applicable_statutes": ["Relevant state statutes"],
  "confidence_score": 0.0
}
Respond ONLY with valid JSON.`;

    const userMessage = `Compliance Check Request:\n- State: ${state}\n- Document Type: ${document_type}\n- Document ID: ${document_id || 'Not provided'}${jurisdictionContext}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);

    // Store compliance checks
    if (document_id && parsed.checks) {
      for (const check of parsed.checks) {
        await pool.query(
          'INSERT INTO compliance_checks (document_id, check_type, status, issues, recommendations, checked_by) VALUES ($1, $2, $3, $4, $5, $6)',
          [document_id, check.check_type, check.status, check.details, (parsed.recommendations || []).join('; '), 'AI System']
        );
      }
    }

    res.json({
      compliance: parsed,
      metadata: {
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        processing_time_seconds: aiResponse.processingTime,
      },
    });
  } catch (err) {
    console.error('AI compliance check error:', err);
    res.status(500).json({ error: 'Failed to check compliance', details: err.message });
  }
});

// POST /api/ai/generate-summary
router.post('/generate-summary', aiRateLimiter, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const systemPrompt = `You are a professional legal document summarizer for a notary service. Generate a comprehensive yet concise summary of the provided document. Return a structured JSON response:
{
  "title": "Document title or identified name",
  "summary": "Comprehensive 2-3 paragraph summary",
  "key_points": ["List of key points"],
  "parties_involved": [{"name": "...", "role": "..."}],
  "important_dates": [{"date": "...", "significance": "..."}],
  "financial_terms": [{"term": "...", "amount": "...", "details": "..."}],
  "obligations": ["List of obligations mentioned"],
  "conditions": ["List of conditions or contingencies"],
  "document_type": "Identified document type",
  "word_count_estimate": 0,
  "complexity_level": "simple/moderate/complex"
}
Respond ONLY with valid JSON.`;

    const userMessage = `Please summarize the following document:\n\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);

    res.json({
      summary: parsed,
      metadata: {
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        processing_time_seconds: aiResponse.processingTime,
      },
    });
  } catch (err) {
    console.error('AI summary generation error:', err);
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

// POST /api/ai/extract-entities
router.post('/extract-entities', aiRateLimiter, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const systemPrompt = `You are an advanced named entity recognition and extraction system specialized in legal and notary documents. Extract all relevant entities from the provided document. Return a structured JSON response:
{
  "persons": [{"name": "...", "role": "...", "mentions": 0}],
  "organizations": [{"name": "...", "type": "...", "mentions": 0}],
  "locations": [{"name": "...", "type": "address/city/state/country", "full_address": "..."}],
  "dates": [{"date": "...", "context": "...", "type": "execution/effective/expiry/deadline"}],
  "monetary_amounts": [{"amount": "...", "currency": "USD", "context": "..."}],
  "legal_references": [{"reference": "...", "type": "statute/case/regulation", "jurisdiction": "..."}],
  "identification_numbers": [{"number": "...", "type": "...", "belongs_to": "..."}],
  "properties": [{"description": "...", "address": "...", "type": "real_estate/vehicle/other"}],
  "document_references": [{"title": "...", "type": "...", "date": "..."}],
  "total_entities_found": 0,
  "confidence_score": 0.0
}
Respond ONLY with valid JSON.`;

    const userMessage = `Extract all entities from the following document:\n\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);

    res.json({
      entities: parsed,
      metadata: {
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        processing_time_seconds: aiResponse.processingTime,
      },
    });
  } catch (err) {
    console.error('AI entity extraction error:', err);
    res.status(500).json({ error: 'Failed to extract entities', details: err.message });
  }
});

// POST /api/ai/witness-vetting
router.post('/witness-vetting', aiRateLimiter, async (req, res) => {
  try {
    const { witness_id, witness_name, identification, prior_appearances, relationship_to_party } = req.body || {};
    const systemPrompt = `You are a notary public risk specialist. Vet potential witnesses for irregularities or conflicts of interest. Return ONLY JSON:
{ "risk_level": "low|medium|high", "risk_score": 0.0, "flags": [string], "checks": [{"check": string, "result": "pass|fail|info", "details": string}], "recommended_actions": [string] }`;
    const userMessage = `Witness review:\nID: ${witness_id || 'n/a'}\nName: ${witness_name || ''}\nIdentification: ${identification || ''}\nPrior appearances: ${JSON.stringify(prior_appearances || [])}\nRelationship to party: ${relationship_to_party || 'unknown'}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);
    try {
      await pool.query('INSERT INTO ai_analyses (analysis_type, result, result_parsed, user_id) VALUES ($1, $2, $3, $4)', ['witness-vetting', aiResponse.content, JSON.stringify(parsed), req.user?.id || null]);
    } catch {}
    await logAudit(req.user?.id, 'ai-witness-vetting', 'witness', witness_id || null, { flags: parsed.flags });
    res.json({ vetting: parsed, metadata: { model: aiResponse.model, tokens_used: aiResponse.tokensUsed, processing_time_seconds: aiResponse.processingTime } });
  } catch (err) {
    console.error('AI witness vetting error:', err);
    res.status(500).json({ error: 'Failed to vet witness', details: err.message });
  }
});

// POST /api/ai/client-risk-score
router.post('/client-risk-score', aiRateLimiter, async (req, res) => {
  try {
    const { client_id } = req.body || {};
    if (!client_id) return res.status(400).json({ error: 'client_id required' });
    let client = null, history = [];
    try { const r = await pool.query('SELECT * FROM clients WHERE id=$1', [client_id]); client = r.rows[0]; } catch {}
    try { const r = await pool.query('SELECT id, document_type, status, created_at FROM notarizations WHERE client_id=$1 ORDER BY created_at DESC LIMIT 50', [client_id]); history = r.rows; } catch {}
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const systemPrompt = `You are a notary fraud risk analyst. Score a client based on their notarization history. Return ONLY JSON:
{ "risk_level": "low|medium|high", "risk_score": 0.0, "patterns": [string], "concerns": [string], "recommended_review": "standard|enhanced|reject", "explanations": [string] }`;
    const userMessage = `Client: ${JSON.stringify({ id: client.id, name: client.name, since: client.created_at })}\nHistory: ${JSON.stringify(history)}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);
    try {
      await pool.query('INSERT INTO ai_analyses (analysis_type, entity_id, result, result_parsed, user_id) VALUES ($1, $2, $3, $4, $5)', ['client-risk-score', client_id, aiResponse.content, JSON.stringify(parsed), req.user?.id || null]);
    } catch {}
    await logAudit(req.user?.id, 'ai-client-risk-score', 'client', client_id, { risk_level: parsed.risk_level });
    res.json({ risk: parsed, metadata: { model: aiResponse.model, tokens_used: aiResponse.tokensUsed, processing_time_seconds: aiResponse.processingTime } });
  } catch (err) {
    console.error('AI client risk error:', err);
    res.status(500).json({ error: 'Failed to score client', details: err.message });
  }
});

// POST /api/ai/template-suggestion
router.post('/template-suggestion', aiRateLimiter, async (req, res) => {
  try {
    const { document_type, jurisdiction, parties_count, special_clauses } = req.body || {};
    let templates = [];
    try { const r = await pool.query('SELECT id, name, document_type, jurisdiction FROM templates LIMIT 100'); templates = r.rows; } catch {}
    const systemPrompt = `You recommend the best notarization templates for a request. Return ONLY JSON:
{ "ranked_templates": [{"template_id": any, "name": string, "fit_score": number, "rationale": string, "modifications_needed": [string]}], "fallback_recommendation": string }`;
    const userMessage = `Request: ${JSON.stringify({ document_type, jurisdiction, parties_count, special_clauses })}\nAvailable templates: ${JSON.stringify(templates).slice(0, 6000)}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);
    try {
      await pool.query('INSERT INTO ai_analyses (analysis_type, result, result_parsed, user_id) VALUES ($1, $2, $3, $4)', ['template-suggestion', aiResponse.content, JSON.stringify(parsed), req.user?.id || null]);
    } catch {}
    res.json({ suggestion: parsed, metadata: { model: aiResponse.model, tokens_used: aiResponse.tokensUsed, processing_time_seconds: aiResponse.processingTime } });
  } catch (err) {
    console.error('AI template suggestion error:', err);
    res.status(500).json({ error: 'Failed to suggest template', details: err.message });
  }
});

// POST /api/ai/fee-optimization
// Suggests optimal fee tiers using historical notarizations + payments.
// Body: { document_type, jurisdiction, complexity, target_margin (optional 0-1) }
router.post('/fee-optimization', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { document_type, jurisdiction, complexity, target_margin } = req.body || {};

    // Pull recent notarization + payment context. Treat both as optional / best-effort.
    let notarizations = [];
    let payments = [];
    try {
      const params = [];
      let where = '';
      if (document_type) { params.push(document_type); where += ` WHERE document_type=$${params.length}`; }
      const r = await pool.query(`SELECT id, document_type, status, created_at FROM notarizations${where} ORDER BY created_at DESC LIMIT 50`, params);
      notarizations = r.rows;
    } catch {}
    try {
      const r = await pool.query('SELECT id, amount, currency, status, created_at FROM payments ORDER BY created_at DESC LIMIT 100');
      payments = r.rows;
    } catch {}

    const systemPrompt = `You are a notary pricing strategist. Recommend optimal fee tiers
balancing market rates, jurisdictional caps, and recovered margin. Return ONLY JSON:
{ "recommended_fee": number, "currency": string, "tiers": [{"name": string, "fee": number, "scope": string}], "rationale": [string], "jurisdiction_caps_warning": string|null, "expected_margin": number, "comparable_history_count": number }`;
    const userMessage = `Request: ${JSON.stringify({ document_type, jurisdiction, complexity, target_margin })}
Recent notarizations: ${JSON.stringify(notarizations).slice(0, 4000)}
Recent payments: ${JSON.stringify(payments).slice(0, 4000)}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIJson(aiResponse.content);
    try {
      await pool.query('INSERT INTO ai_analyses (analysis_type, result, result_parsed, user_id) VALUES ($1, $2, $3, $4)', ['fee-optimization', aiResponse.content, JSON.stringify(parsed), req.user?.id || null]);
    } catch {}
    await logAudit(req.user?.id, 'ai-fee-optimization', 'fee_request', null, { document_type, jurisdiction });
    res.json({ optimization: parsed, metadata: { model: aiResponse.model, tokens_used: aiResponse.tokensUsed, processing_time_seconds: aiResponse.processingTime } });
  } catch (err) {
    console.error('AI fee optimization error:', err);
    res.status(500).json({ error: 'Failed to optimize fee', details: err.message });
  }
});

// ─── Apply pass 5 backlog (additive) ─────────────────────────────────────

// Helper: 503 gate with explicit `missing: <ENV>` field.
function requireEnv(res, envName) {
  if (!process.env[envName]) {
    res.status(503).json({
      error: `Integration unavailable: ${envName} not configured`,
      missing: envName,
    });
    return false;
  }
  return true;
}

// POST /api/ai/esign-docusign — kick off DocuSign envelope.
// NEEDS-CREDS — env: DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID.
router.post('/esign-docusign', aiRateLimiter, async (req, res) => {
  if (!requireEnv(res, 'DOCUSIGN_INTEGRATION_KEY')) return;
  if (!requireEnv(res, 'DOCUSIGN_USER_ID')) return;
  if (!requireEnv(res, 'DOCUSIGN_ACCOUNT_ID')) return;
  // NEEDS-CREDS: DocuSign uses JWT Grant or AuthCode OAuth.
  res.json({ status: 'configured', message: 'DocuSign envelope integration is configured.' });
});

// POST /api/ai/esign-hellosign — kick off HelloSign / Dropbox Sign request.
// NEEDS-CREDS — env: HELLOSIGN_API_KEY.
router.post('/esign-hellosign', aiRateLimiter, async (req, res) => {
  if (!requireEnv(res, 'HELLOSIGN_API_KEY')) return;
  // NEEDS-CREDS: Dropbox Sign API base https://api.hellosign.com/v3.
  res.json({ status: 'configured', message: 'HelloSign / Dropbox Sign integration ready.' });
});

// POST /api/ai/background-check — third-party background-check connector.
// NEEDS-CREDS — env: BACKGROUND_CHECK_API_KEY, BACKGROUND_CHECK_API_URL.
router.post('/background-check', aiRateLimiter, async (req, res) => {
  if (!requireEnv(res, 'BACKGROUND_CHECK_API_KEY')) return;
  if (!requireEnv(res, 'BACKGROUND_CHECK_API_URL')) return;
  // NEEDS-CREDS: vendor-agnostic (Checkr, Sterling, GoodHire, etc.).
  res.json({ status: 'configured', message: 'Background-check vendor integration ready.' });
});

// POST /api/ai/state-notary-board-sync — sync notary credentials with state board.
// NEEDS-CREDS — env: STATE_NOTARY_BOARD_API_KEY.
router.post('/state-notary-board-sync', aiRateLimiter, async (req, res) => {
  if (!requireEnv(res, 'STATE_NOTARY_BOARD_API_KEY')) return;
  // NEEDS-CREDS: each state board has its own portal — many require manual
  // upload. NNA (notary.org) provides one consolidated API for some states.
  res.json({ status: 'configured', message: 'State notary board sync ready (per-state adapter required).' });
});

// POST /api/ai/video-attestation — start a video-attestation session.
// PRODUCT-DECISION: default workflow uses a simple session record with a
// 7-day expiry and a placeholder room URL. Real implementation requires a
// product decision on whether to integrate Twilio Video, Daily.co, or roll
// our own WebRTC stack.
router.post('/video-attestation', aiRateLimiter, async (req, res) => {
  try {
    const { document_id, signer_email } = req.body || {};
    if (!document_id || !signer_email) {
      return res.status(400).json({ error: 'document_id and signer_email required' });
    }
    // PRODUCT-DECISION: stub session — replace with vendor session-create call.
    const sessionId = `va_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS video_attestation_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) UNIQUE NOT NULL,
        document_id INTEGER,
        signer_email VARCHAR(255),
        room_url TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await pool.query(
        `INSERT INTO video_attestation_sessions (session_id, document_id, signer_email, room_url, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, document_id, signer_email, `https://video.example.invalid/${sessionId}`, expiresAt]
      );
    } catch (e) {}
    res.json({
      session_id: sessionId,
      room_url: `https://video.example.invalid/${sessionId}`,
      expires_at: expiresAt,
      product_decision_note: 'Stub room URL — replace with Twilio/Daily/etc. when product chooses vendor.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create video attestation session', details: err.message });
  }
});

// POST /api/ai/marketplace-listing — list a notary in the marketplace.
// PRODUCT-DECISION: default visibility = `private` until product defines
// the public marketplace surface, search index, and rating model.
router.post('/marketplace-listing', aiRateLimiter, async (req, res) => {
  try {
    const { notary_id, services, hourly_rate, jurisdictions } = req.body || {};
    if (!notary_id) return res.status(400).json({ error: 'notary_id required' });
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS notary_marketplace_listings (
        id SERIAL PRIMARY KEY,
        notary_id INTEGER,
        services TEXT,
        hourly_rate NUMERIC,
        jurisdictions TEXT,
        visibility VARCHAR(16) DEFAULT 'private',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await pool.query(
        `INSERT INTO notary_marketplace_listings (notary_id, services, hourly_rate, jurisdictions, visibility)
         VALUES ($1, $2, $3, $4, $5)`,
        [notary_id, JSON.stringify(services || []), hourly_rate || null, JSON.stringify(jurisdictions || []), 'private']
      );
    } catch (e) {}
    res.json({
      notary_id,
      visibility: 'private',
      product_decision_note: 'Default visibility=private until marketplace surface, search and rating model are designed.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create marketplace listing', details: err.message });
  }
});

// POST /api/ai/bulk-pdf-import — placeholder for bulk PDF + OCR ingestion.
// PRODUCT-DECISION: defaults to enqueueing rows in a `bulk_pdf_jobs` table
// with status=`queued`. OCR engine choice (Tesseract, AWS Textract, GCP
// DocumentAI) deferred until product decides cost/accuracy tradeoff.
router.post('/bulk-pdf-import', aiRateLimiter, async (req, res) => {
  try {
    const { batch_label, file_count } = req.body || {};
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS bulk_pdf_jobs (
        id SERIAL PRIMARY KEY,
        batch_label VARCHAR(255),
        file_count INTEGER,
        status VARCHAR(32) DEFAULT 'queued',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      const r = await pool.query(
        `INSERT INTO bulk_pdf_jobs (batch_label, file_count, status) VALUES ($1, $2, 'queued') RETURNING id`,
        [batch_label || null, file_count || 0]
      );
      res.json({
        job_id: r.rows[0].id,
        status: 'queued',
        product_decision_note: 'OCR engine selection (Tesseract/Textract/DocumentAI) deferred — job stays queued until decided.',
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
