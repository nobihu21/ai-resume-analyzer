const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const axios = require('axios');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

function getFirebaseCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  const localServiceAccount = path.join(__dirname, 'ai-resume-analyzer-22955-firebase-adminsdk-fbsvc-4359f2a406.json');
  if (fs.existsSync(localServiceAccount)) {
    return require(localServiceAccount);
  }

  return null;
}

const firebaseCredential = getFirebaseCredential();
if (firebaseCredential && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredential),
  });
} else if (!firebaseCredential) {
  console.warn('[SERVER] Firebase Admin credentials are not configured.');
}

const db = firebaseCredential ? admin.firestore() : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF uploads are supported'));
    }
    cb(null, true);
  },
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const rateLimitStore = new Map();
const rateLimit = ({ windowMs = 60_000, max = 60 } = {}) => (req, res, next) => {
  const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);

  if (entry.count > max) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  next();
};

app.use('/api', rateLimit({ max: Number(process.env.RATE_LIMIT_PER_MINUTE || 60) }));

async function extractPdfText(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (e) {
    console.error('[PDF EXTRACTION ERROR]', e.message);
    throw new Error('Failed to extract PDF text');
  }
}

async function callAIService(endpoint, data) {
  if (OPENROUTER_API_KEY) {
    return callOpenRouterDirect(endpoint, data);
  }

  if (!AI_SERVICE_URL) {
    throw new Error('AI service is not configured');
  }

  try {
    const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, data, {
      timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS || 30000),
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
    console.error(`[AI SERVICE ERROR] ${endpoint}:`, errorMsg);
    throw new Error(`AI Service Error: ${errorMsg}`);
  }
}

function stripJsonFence(value) {
  const content = String(value || '').trim();
  if (!content.startsWith('```')) {
    return content;
  }
  return content
    .split('\n')
    .filter((line) => !line.trim().startsWith('```'))
    .join('\n')
    .trim();
}

async function callOpenRouter(messages, { json = false, maxTokens = 2000 } = {}) {
  const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, {
    model: OPENROUTER_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  }, {
    timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS || 30000),
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_APP_URL || 'https://ai-resume-analyzer-six-topaz.vercel.app',
      'X-Title': 'AI Resume Analyzer',
    },
  });

  const content = response.data?.choices?.[0]?.message?.content || '';
  if (!json) {
    return content;
  }

  try {
    return JSON.parse(stripJsonFence(content));
  } catch (error) {
    throw new Error(`Invalid JSON response from AI: ${error.message}`);
  }
}

async function callOpenRouterDirect(endpoint, data) {
  const jsonSystem = 'You are a helpful assistant. You MUST respond with valid JSON only. No markdown, no explanation, no extra text.';

  if (endpoint === '/analyze-resume') {
    const prompt = `You are an expert ATS (Applicant Tracking System) specialist. Analyze this resume comprehensively.

RESUME:
${data.resume_text}

Analyze and return ONLY valid JSON with these fields:
- score: number 0-100 (0=poor, 100=perfect for ATS)
- missing_keywords: array of important industry keywords not found (max 8)
- suggestions: array of 3-4 specific, actionable improvement suggestions

JSON FORMAT ONLY:
{"score":75,"missing_keywords":["Kubernetes","AWS"],"suggestions":["Add metrics to achievements","Use standard section headers"]}`;

    return callOpenRouter([
      { role: 'system', content: jsonSystem },
      { role: 'user', content: prompt },
    ], { json: true });
  }

  if (endpoint === '/analyze-job') {
    const prompt = `You are an expert recruiter and job analyst. Extract and analyze this job posting.

JOB DESCRIPTION:
${data.job_description}

Extract and return ONLY valid JSON with:
- skills: array of top 6-8 technical/soft skills required
- requirements: array of 4-5 key requirements
- keywords: array of important industry/role keywords for ATS (max 8)

JSON FORMAT ONLY:
{"skills":["Python","AWS","Leadership"],"requirements":["5+ years experience","BS in CS"],"keywords":["Cloud Engineer","DevOps"]}`;

    return callOpenRouter([
      { role: 'system', content: jsonSystem },
      { role: 'user', content: prompt },
    ], { json: true });
  }

  if (endpoint === '/match-score') {
    const prompt = `You are an expert career counselor. Compare this resume against the job description.

RESUME:
${data.resume_text}

JOB DESCRIPTION:
${data.job_description}

Analyze fit and return ONLY valid JSON:
- match_percentage: number 0-100
- missing_skills: array of 3-5 skills they should develop
- explanation: 2-3 sentences explaining the match

JSON FORMAT ONLY:
{"match_percentage":82,"missing_skills":["Kubernetes","Go Programming"],"explanation":"Strong backend skills but lacks cloud orchestration experience."}`;

    return callOpenRouter([
      { role: 'system', content: jsonSystem },
      { role: 'user', content: prompt },
    ], { json: true });
  }

  if (endpoint === '/generate-cover-letter') {
    const prompt = `You are a professional career coach writing cover letters. Create a compelling, personalized cover letter.

CANDIDATE'S RESUME:
${data.resume_text}

TARGET JOB DESCRIPTION:
${data.job_description}

Write a professional cover letter with:
1. Strong opening paragraph expressing genuine interest
2. Middle paragraph highlighting specific skills/achievements that match the job
3. Closing paragraph with strong call to action

Requirements:
- Total length: 150-250 words
- Professional, enthusiastic tone
- Personalized
- Start with "Dear Hiring Manager,"
- End with professional closing

Return ONLY the complete cover letter text.`;

    const coverLetter = await callOpenRouter([
      { role: 'system', content: 'You are a helpful career assistant providing professional cover letters.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 1500 });
    return { cover_letter: coverLetter };
  }

  if (endpoint === '/chat') {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert AI career assistant helping with resumes, interviews, career growth, job search, salary negotiation, and industry insights. Provide concise, actionable, professional advice.',
      },
      ...data.messages,
    ];
    const response = await callOpenRouter(messages, { maxTokens: 1000 });
    return { response };
  }

  throw new Error(`Unsupported AI endpoint: ${endpoint}`);
}

function requireFirestore() {
  if (!db) {
    throw new Error('Firebase Admin is not configured');
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

async function requireAuth(req, res, next) {
  try {
    if (!firebaseCredential) {
      return res.status(503).json({ error: 'Authentication service is not configured' });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

function validateText(value, field, { min = 1, max = 20000 } = {}) {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new Error(`${field} is too short`);
  }
  if (trimmed.length > max) {
    throw new Error(`${field} is too long`);
  }
  return trimmed;
}

function normalizeMatchScore(value) {
  const score = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
}

function timestampMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  return new Date(value).getTime() || 0;
}

function sortByCreatedAtDesc(items) {
  return items.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

app.post('/api/analyze-resume', requireAuth, upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const resumeText = await extractPdfText(req.file.buffer);
  if (resumeText.trim().length < 50) {
    return res.status(400).json({ error: 'Resume text is too short' });
  }

  const aiResponse = await callAIService('/analyze-resume', {
    resume_text: resumeText,
  });

  res.json(aiResponse);
}));

app.post('/api/analyze-job', requireAuth, asyncHandler(async (req, res) => {
  const jobDescription = validateText(req.body.jobDescription, 'Job description', { min: 50, max: 50000 });

  const aiResponse = await callAIService('/analyze-job', {
    job_description: jobDescription,
  });

  res.json(aiResponse);
}));

app.post('/api/match-score', requireAuth, upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const jobDescription = validateText(req.body.jobDescription, 'Job description', { min: 50, max: 50000 });
  const resumeText = await extractPdfText(req.file.buffer);

  const aiResponse = await callAIService('/match-score', {
    resume_text: resumeText,
    job_description: jobDescription,
  });

  res.json(aiResponse);
}));

app.post('/api/generate-cover-letter', requireAuth, upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const jobDescription = validateText(req.body.jobDescription, 'Job description', { min: 50, max: 50000 });
  const resumeText = await extractPdfText(req.file.buffer);

  const aiResponse = await callAIService('/generate-cover-letter', {
    resume_text: resumeText,
    job_description: jobDescription,
  });

  res.json(aiResponse);
}));

app.post('/api/chat', requireAuth, asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
    return res.status(400).json({ error: 'A valid messages array is required' });
  }

  const sanitizedMessages = messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: validateText(message.content, 'Message content', { min: 1, max: 5000 }),
  }));

  const aiResponse = await callAIService('/chat', {
    messages: sanitizedMessages,
    userId: req.user.uid,
  });

  res.json(aiResponse);
}));

app.post('/api/jobs', requireAuth, asyncHandler(async (req, res) => {
  requireFirestore();

  if (req.body.userId && req.body.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Cannot create data for another user' });
  }

  const jobData = {
    company: validateText(req.body.company, 'Company', { min: 1, max: 200 }),
    role: validateText(req.body.role, 'Role', { min: 1, max: 200 }),
    status: req.body.status || 'applied',
    notes: typeof req.body.notes === 'string' ? req.body.notes.slice(0, 5000) : '',
    date: req.body.date || new Date().toISOString().split('T')[0],
    matchScore: normalizeMatchScore(req.body.matchScore),
    userId: req.user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('jobs').add(jobData);
  res.json({ id: docRef.id, ...jobData });
}));

app.get('/api/jobs/:userId', requireAuth, asyncHandler(async (req, res) => {
  requireFirestore();

  if (req.params.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Cannot access another user data' });
  }

  const snapshot = await db.collection('jobs')
    .where('userId', '==', req.user.uid)
    .get();

  const jobs = sortByCreatedAtDesc(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  res.json(jobs);
}));

app.put('/api/jobs/:jobId', requireAuth, asyncHandler(async (req, res) => {
  requireFirestore();

  const jobRef = db.collection('jobs').doc(req.params.jobId);
  const existingDoc = await jobRef.get();

  if (!existingDoc.exists) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const existingJob = existingDoc.data();
  if (existingJob.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Cannot update another user data' });
  }

  const updateData = {
    company: req.body.company ? validateText(req.body.company, 'Company', { min: 1, max: 200 }) : existingJob.company,
    role: req.body.role ? validateText(req.body.role, 'Role', { min: 1, max: 200 }) : existingJob.role,
    status: req.body.status || existingJob.status,
    notes: typeof req.body.notes === 'string' ? req.body.notes.slice(0, 5000) : existingJob.notes,
    date: req.body.date || existingJob.date,
    matchScore: normalizeMatchScore(req.body.matchScore),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await jobRef.update(updateData);
  const updatedDoc = await jobRef.get();
  res.json({ id: req.params.jobId, ...updatedDoc.data() });
}));

app.delete('/api/jobs/:jobId', requireAuth, asyncHandler(async (req, res) => {
  requireFirestore();

  const jobRef = db.collection('jobs').doc(req.params.jobId);
  const existingDoc = await jobRef.get();

  if (!existingDoc.exists) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (existingDoc.data().userId !== req.user.uid) {
    return res.status(403).json({ error: 'Cannot delete another user data' });
  }

  await jobRef.delete();
  res.json({ success: true, id: req.params.jobId });
}));

app.post('/api/ai-results', requireAuth, asyncHandler(async (req, res) => {
  requireFirestore();

  if (!req.body.type) {
    return res.status(400).json({ error: 'type is required' });
  }

  const resultData = {
    userId: req.user.uid,
    type: String(req.body.type).slice(0, 80),
    content: req.body.content || '',
    relatedJobId: req.body.relatedJobId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('ai_results').add(resultData);
  res.json({ id: docRef.id, ...resultData });
}));

app.get('/api/ai-results/:userId', requireAuth, asyncHandler(async (req, res) => {
  requireFirestore();

  if (req.params.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Cannot access another user data' });
  }

  let query = db.collection('ai_results').where('userId', '==', req.user.uid);
  if (req.query.type) {
    query = query.where('type', '==', String(req.query.type).slice(0, 80));
  }

  const snapshot = await query.get();
  const results = sortByCreatedAtDesc(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  res.json(results);
}));

app.get('/api/health', asyncHandler(async (req, res) => {
  if (OPENROUTER_API_KEY) {
    return res.json({
      status: 'ok',
      service: 'Node.js AI Resume Analyzer',
      ai_service: 'connected',
      ai_provider: 'openrouter',
      firebase: db ? 'configured' : 'missing',
    });
  }

  try {
    await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({
      status: 'ok',
      service: 'Node.js AI Resume Analyzer',
      ai_service: 'connected',
      firebase: db ? 'configured' : 'missing',
    });
  } catch (e) {
    res.json({
      status: 'ok',
      service: 'Node.js AI Resume Analyzer',
      ai_service: 'disconnected',
      firebase: db ? 'configured' : 'missing',
      error: e.message,
    });
  }
}));

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Node.js Server running on port ${PORT}`);
    console.log(`AI Service URL: ${AI_SERVICE_URL}`);
    console.log(`Firebase: ${db ? 'configured' : 'missing'}`);
  });
}

module.exports = app;
