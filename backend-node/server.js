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
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
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
