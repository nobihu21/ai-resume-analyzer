# AI Job Assistant - Full Stack PWA

A modern, AI-powered application designed to help job seekers optimize their resumes, analyze job descriptions, and track applications.

## 🚀 Features
- **ATS Resume Analyzer**: Get a score and optimization tips.
- **Job Description Insights**: Extract key skills and requirements.
- **Match Engine**: Compare your resume against a specific JD.
- **AI Cover Letter Generator**: Create tailored cover letters in seconds.
- **Job Tracker**: Manage all your applications in one place.
- **Modern UI**: Clean, responsive SaaS-style dashboard.

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Bootstrap 5, Framer Motion, Lucide Icons.
- **Backend (Orchestration)**: Node.js, Express, Firebase Admin.
- **AI Service**: FastAPI (Python), OpenAI API.
- **Database/Auth**: Firebase (Auth, Firestore, Storage).

## 🏃 Getting Started

### 1. AI Backend (FastAPI)
```bash
cd backend-ai
pip install -r requirements.txt
# Set OPENAI_API_KEY in .env
python main.py
```

### 2. Node Backend
```bash
cd backend-node
npm install
# Setup Firebase service account in server.js or .env
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📝 Configuration
- **Firebase**: Replace `firebaseConfig` and service account keys in the respective backend/frontend files.
- **OpenAI**: Ensure you have a valid API key in `backend-ai/.env`.

## 📱 PWA Support
This app is ready to be configured as a PWA using `vite-plugin-pwa` for offline support and installation.

## Production Deployment on Vercel

This repository is configured as a Vercel monorepo:

- Frontend: Vite build from `frontend/`
- Node API: Express serverless function from `backend-node/server.js`
- AI service: FastAPI service expected at `AI_SERVICE_URL`

Set these Vercel environment variables before deploying:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

AI_SERVICE_URL=https://your-ai-service.example.com
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account", "...": "..."}'
RATE_LIMIT_PER_MINUTE=60
```

If the FastAPI AI service is not deployed separately, AI endpoints will fail while the frontend and Firestore-backed features can still deploy.
