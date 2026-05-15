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
