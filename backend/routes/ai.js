const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const fetch = require('node-fetch');

router.use(auth);

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
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
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

function parseAIResponse(content) {
  try {
    // Try parsing as JSON first
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Return structured text response
    return { raw_analysis: content };
  }
}

// POST /api/ai/analyze-document
router.post('/analyze-document', async (req, res) => {
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
  "confidence_score": 0.0-1.0,
  "risk_level": "low/medium/high"
}
Respond ONLY with valid JSON.`;

    const userMessage = `Analysis type: ${analysis_type || 'content_analysis'}\n\nDocument content:\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse.content);

    // Store the analysis in the database
    if (document_id) {
      await pool.query(
        'INSERT INTO ai_analyses (document_id, analysis_type, result, confidence, model_used, tokens_used, processing_time) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [document_id, analysis_type || 'content_analysis', JSON.stringify(parsed), parsed.confidence_score || 0.85, aiResponse.model, aiResponse.tokensUsed, aiResponse.processingTime]
      );
    }

    res.json({
      analysis: parsed,
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
router.post('/verify-identity', async (req, res) => {
  try {
    const { client_id, document_type, document_number } = req.body;

    if (!document_type || !document_number) {
      return res.status(400).json({ error: 'Document type and document number are required' });
    }

    const systemPrompt = `You are an expert identity verification specialist for a notary service. Based on the provided identification details, perform a verification analysis. Return a structured JSON response:
{
  "verification_status": "verified/unverified/needs_review",
  "confidence_score": 0.0-1.0,
  "document_format_valid": true/false,
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
    const parsed = parseAIResponse(aiResponse.content);

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
router.post('/detect-fraud', async (req, res) => {
  try {
    const { document_id, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    const systemPrompt = `You are an advanced fraud detection AI specializing in legal and notarized documents. Analyze the provided document content for signs of fraud, forgery, or tampering. Return a structured JSON response:
{
  "risk_level": "low/medium/high/critical",
  "risk_score": 0.0-1.0,
  "overall_assessment": "Brief overall assessment",
  "fraud_indicators": [
    {"indicator": "Description", "severity": "low/medium/high", "details": "..."}
  ],
  "authenticity_analysis": {
    "language_consistency": {"score": 0.0-1.0, "notes": "..."},
    "formatting_analysis": {"score": 0.0-1.0, "notes": "..."},
    "content_coherence": {"score": 0.0-1.0, "notes": "..."},
    "legal_terminology": {"score": 0.0-1.0, "notes": "..."}
  },
  "flags": ["List of specific flags raised"],
  "recommendations": ["Recommended actions"],
  "confidence_score": 0.0-1.0
}
Respond ONLY with valid JSON.`;

    const userMessage = `Fraud Detection Analysis Request:\n\nDocument content:\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse.content);

    // Store the fraud detection result
    if (document_id) {
      await pool.query(
        'INSERT INTO fraud_detections (document_id, risk_level, risk_score, ai_analysis, flags, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [document_id, parsed.risk_level || 'low', parsed.risk_score || 0.1, JSON.stringify(parsed), parsed.flags || [], parsed.risk_level === 'high' || parsed.risk_level === 'critical' ? 'flagged' : 'clean']
      );
    }

    res.json({
      fraud_analysis: parsed,
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
router.post('/check-compliance', async (req, res) => {
  try {
    const { document_id, state, document_type } = req.body;

    if (!state || !document_type) {
      return res.status(400).json({ error: 'State and document type are required' });
    }

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
  "confidence_score": 0.0-1.0
}
Respond ONLY with valid JSON.`;

    const userMessage = `Compliance Check Request:\n- State: ${state}\n- Document Type: ${document_type}\n- Document ID: ${document_id || 'Not provided'}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse.content);

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
router.post('/generate-summary', async (req, res) => {
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
    const parsed = parseAIResponse(aiResponse.content);

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
router.post('/extract-entities', async (req, res) => {
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
  "confidence_score": 0.0-1.0
}
Respond ONLY with valid JSON.`;

    const userMessage = `Extract all entities from the following document:\n\n${content}`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse.content);

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

module.exports = router;
