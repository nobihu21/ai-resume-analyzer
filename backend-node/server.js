const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Firebase Admin
const serviceAccount = require('./ai-resume-analyzer-22955-firebase-adminsdk-fbsvc-4359f2a406.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore?.() || null;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

console.log(`[SERVER] Connecting to AI Service at: ${AI_SERVICE_URL}`);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ 
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function extractPdfText(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (e) {
    console.error("PDF EXTRACTION ERROR:", e.message);
    throw new Error(`Failed to extract PDF text: ${e.message}`);
  }
}

async function callAIService(endpoint, data) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, data, {
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message;
    console.error(`[AI SERVICE ERROR] ${endpoint}:`, errorMsg);
    throw new Error(`AI Service Error: ${errorMsg}`);
  }
}

// ============================================
// ENDPOINTS
// ============================================

// 1. Resume Upload & Analysis
app.post('/api/analyze-resume', upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log(`[RESUME ANALYSIS] File size: ${req.file.size} bytes`);

  const resumeText = await extractPdfText(req.file.buffer);
  console.log(`[RESUME ANALYSIS] Extracted text: ${resumeText.length} chars`);

  const aiResponse = await callAIService('/analyze-resume', {
    resume_text: resumeText
  });

  res.json(aiResponse);
}));

// 2. Job Analysis
app.post('/api/analyze-job', asyncHandler(async (req, res) => {
  const { jobDescription } = req.body;
  
  if (!jobDescription || jobDescription.trim().length < 50) {
    return res.status(400).json({ error: "Job description is too short" });
  }

  console.log(`[JOB ANALYSIS] Description length: ${jobDescription.length} chars`);

  const aiResponse = await callAIService('/analyze-job', {
    job_description: jobDescription
  });

  res.json(aiResponse);
}));

// 3. Match Score
app.post('/api/match-score', upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { jobDescription } = req.body;
  
  if (!jobDescription || jobDescription.trim().length < 50) {
    return res.status(400).json({ error: "Job description is too short" });
  }

  console.log(`[MATCH SCORE] Resume size: ${req.file.size}, JD length: ${jobDescription.length}`);

  const resumeText = await extractPdfText(req.file.buffer);

  const aiResponse = await callAIService('/match-score', {
    resume_text: resumeText,
    job_description: jobDescription
  });

  res.json(aiResponse);
}));

// 4. Generate Cover Letter
app.post('/api/generate-cover-letter', upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { jobDescription } = req.body;
  
  if (!jobDescription || jobDescription.trim().length < 50) {
    return res.status(400).json({ error: "Job description is too short" });
  }

  console.log(`[COVER LETTER] Resume size: ${req.file.size}, JD length: ${jobDescription.length}`);

  const resumeText = await extractPdfText(req.file.buffer);

  const aiResponse = await callAIService('/generate-cover-letter', {
    resume_text: resumeText,
    job_description: jobDescription
  });

  res.json(aiResponse);
}));

// 5. Chat Endpoint
app.post('/api/chat', asyncHandler(async (req, res) => {
  const { messages, userId } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages provided" });
  }

  console.log(`[CHAT] Messages: ${messages.length}, User: ${userId}`);

  const aiResponse = await callAIService('/chat', {
    messages: messages,
    userId: userId
  });

  res.json(aiResponse);
}));

// ============================================
// FIRESTORE ENDPOINTS
// ============================================

// 6. Create Job Entry
app.post('/api/jobs', asyncHandler(async (req, res) => {
  const { company, role, status, notes, date, matchScore, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const jobData = {
    company,
    role,
    status: status || 'applied',
    notes: notes || '',
    date: date || new Date().toISOString().split('T')[0],
    matchScore: matchScore || 0,
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('jobs').add(jobData);
  console.log(`[JOBS] Created job: ${docRef.id} for user: ${userId}`);

  res.json({ id: docRef.id, ...jobData });
}));

// 7. Get User Jobs
app.get('/api/jobs/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  console.log(`[JOBS] Fetching jobs for user: ${userId}`);

  const snapshot = await db.collection('jobs')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(jobs);
}));

// 8. Update Job Entry
app.put('/api/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const updateData = {
    ...req.body,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const jobRef = db.collection('jobs').doc(jobId);
  await jobRef.update(updateData);

  console.log(`[JOBS] Updated job: ${jobId}`);

  const updatedDoc = await jobRef.get();
  res.json({ id: jobId, ...updatedDoc.data() });
}));

// 9. Delete Job Entry
app.delete('/api/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  await db.collection('jobs').doc(jobId).delete();
  console.log(`[JOBS] Deleted job: ${jobId}`);

  res.json({ success: true, id: jobId });
}));

// 10. Save AI Results
app.post('/api/ai-results', asyncHandler(async (req, res) => {
  const { userId, type, content, relatedJobId } = req.body;

  if (!userId || !type) {
    return res.status(400).json({ error: "userId and type are required" });
  }

  const resultData = {
    userId,
    type, // 'resume_analysis', 'cover_letter', 'match_score', etc.
    content,
    relatedJobId: relatedJobId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('ai_results').add(resultData);
  console.log(`[AI_RESULTS] Saved ${type} for user: ${userId}`);

  res.json({ id: docRef.id, ...resultData });
}));

// 11. Get AI Results for User
app.get('/api/ai-results/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  console.log(`[AI_RESULTS] Fetching results for user: ${userId}, type: ${type}`);

  let query = db.collection('ai_results').where('userId', '==', userId);
  
  if (type) {
    query = query.where('type', '==', type);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  res.json(results);
}));

// 12. Health Check
app.get('/api/health', asyncHandler(async (req, res) => {
  try {
    // Check AI service
    await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    
    res.json({ 
      status: 'ok',
      service: 'Node.js AI Resume Analyzer',
      ai_service: 'connected'
    });
  } catch (e) {
    res.json({ 
      status: 'ok',
      service: 'Node.js AI Resume Analyzer',
      ai_service: 'disconnected',
      error: e.message
    });
  }
}));

// ============================================
// LOGGING & SERVER START
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Node.js Server running on port ${PORT}`);
  console.log(`📡 AI Service URL: ${AI_SERVICE_URL}`);
  console.log(`🔥 Firebase initialized`);
  console.log(`${'='.repeat(50)}\n`);
});
