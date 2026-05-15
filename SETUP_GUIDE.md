# 🚀 Complete Setup & Configuration Guide

This guide walks you through setting up and running the AI Job Assistant SaaS application.

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** 16+ ([Download](https://nodejs.org))
- **Python** 3.9+ ([Download](https://python.org))
- **Git** for version control
- **Firebase Project** with credentials
- **OpenRouter API Key** for AI
- **Code Editor** (VS Code recommended)

---

## 🔥 Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Name: "AI Resume Analyzer"
4. Choose your region
5. Wait for project creation

### 1.2 Enable Authentication
1. In Firebase console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. Enable **Google** sign-in method
5. Add your domain to authorized domains

### 1.3 Enable Firestore Database
1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (or Start in test mode for development)
4. Choose your region
5. Wait for database creation

### 1.4 Get Your Credentials
1. Go to **Project Settings** (gear icon)
2. Click **Service Accounts** tab
3. Click "Generate new private key"
4. Save the JSON file as `ai-resume-analyzer-22955-firebase-adminsdk-fbsvc-e164730ef0.json`
5. Place it in `backend-node/` directory

### 1.5 Get Web App Credentials
1. In Project Settings, click **General** tab
2. Scroll to "Your apps" section
3. Click the web app icon `</>`
4. Copy the Firebase config
5. You'll use this in `firebase.js`

---

## 🔑 Step 2: OpenRouter API Setup

### 2.1 Get API Key
1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up for an account
3. Go to **API Keys** section
4. Click "Create Key"
5. Copy the API key

### 2.2 Create .env File
In `backend-ai/` directory, create `.env` file:
```env
OPENROUTER_API_KEY=sk_live_your_actual_key_here
```

---

## 💻 Step 3: Frontend Setup

### 3.1 Navigate to Frontend
```bash
cd frontend
```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Configure Firebase
Edit `src/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

Get these values from Firebase Project Settings → Web App → Firebaseconfig

### 3.4 Run Development Server
```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

### 3.5 Test Frontend
- Try accessing http://localhost:5173
- Should show the Auth page
- Click "Sign Up" to test signup flow
- (Backend won't work until servers are running)

---

## 🔌 Step 4: Node.js Backend Setup

### 4.1 Navigate to Backend
```bash
cd backend-node
```

### 4.2 Install Dependencies
```bash
npm install
```

### 4.3 Verify Firebase Credentials
Ensure the Firebase service account JSON is in `backend-node/` directory:
```
ai-resume-analyzer-22955-firebase-adminsdk-fbsvc-e164730ef0.json
```

### 4.4 Create .env File (Optional)
```env
PORT=5000
AI_SERVICE_URL=http://127.0.0.1:8000
NODE_ENV=development
```

### 4.5 Run the Server
```bash
npm start
```

You should see:
```
==================================================
✅ Node.js Server running on port 5000
📡 AI Service URL: http://127.0.0.1:8000
🔥 Firebase initialized
==================================================
```

### 4.6 Test Node Backend
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "status": "ok",
  "service": "Node.js AI Resume Analyzer"
}
```

---

## 🤖 Step 5: FastAPI Backend Setup

### 5.1 Navigate to Backend AI
```bash
cd backend-ai
```

### 5.2 Create Virtual Environment
**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 5.3 Install Dependencies
```bash
pip install -r requirements.txt
```

If `requirements.txt` is missing, create it:
```bash
pip install fastapi uvicorn openai python-dotenv pydantic
pip freeze > requirements.txt
```

### 5.4 Create .env File
```env
OPENROUTER_API_KEY=sk_live_your_actual_key_here
```

### 5.5 Run the Server
```bash
python main.py
```

You should see:
```
SUCCESS: OpenRouter API Key loaded successfully.
INFO: Application startup complete [Uvicorn running on 127.0.0.1:8000]
```

### 5.6 Test FastAPI
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "ok",
  "service": "AI Job Assistant"
}
```

---

## ✅ Step 6: Verify Everything Works

### 6.1 Check All Services Running
```bash
# Terminal 1 - Frontend
cd frontend && npm run dev  # http://localhost:5173

# Terminal 2 - Node Backend
cd backend-node && npm start  # http://localhost:5000

# Terminal 3 - FastAPI Backend
cd backend-ai && python main.py  # http://localhost:8000
```

### 6.2 Test Authentication Flow
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Enter email, password, confirm password
4. Click "Sign Up"
5. Should redirect to dashboard
6. Check Firebase Console → Authentication (user should appear)
7. Check Firestore → users collection (profile should be saved)

### 6.3 Test File Upload
1. Go to "Resume Analyzer"
2. Upload a PDF resume
3. Click "Start Analysis"
4. Wait for AI response
5. Should show ATS score and suggestions

### 6.4 Test Chatbot
1. Go to "AI Assistant"
2. Type a question
3. Click send button
4. Should see response from AI

### 6.5 Test Job Tracker
1. Go to "Job Tracker"
2. Click "Add Application"
3. Fill form and submit
4. Job should appear in table
5. Check Firestore → jobs collection

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'firebase'"
**Solution:**
```bash
cd frontend
npm install firebase
```

### Issue: "OPENROUTER_API_KEY is not set"
**Solution:**
1. Check `.env` file exists in `backend-ai/`
2. Verify API key is correct
3. Restart FastAPI server

### Issue: "Firebase connection failed"
**Solution:**
1. Check Firebase credentials in `firebase.js`
2. Verify Firestore rules allow reads/writes
3. Check internet connection

### Issue: "AI responses empty"
**Solution:**
1. Verify OpenRouter API key is valid
2. Check API credits remaining
3. See FastAPI console for error messages

### Issue: "File upload fails"
**Solution:**
1. Ensure file is valid PDF
2. Check file size < 10MB
3. Verify Node backend is running

### Issue: "Cannot find 'backend-ai/main.py'"
**Solution:**
1. Check you're in correct directory
2. Verify file exists: `backend-ai/main.py`
3. Check Python installation: `python --version`

### Issue: "Port already in use"
**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill process (if needed)
# Windows
taskkill /PID <process_id> /F

# macOS/Linux
kill -9 <process_id>
```

---

## 📱 Testing Checklist

### Authentication
- [ ] Email signup works
- [ ] Email login works
- [ ] Google login works
- [ ] Logout works
- [ ] Protected routes redirect to login

### Dashboard
- [ ] Shows user profile
- [ ] Shows statistics
- [ ] Shows recent activity
- [ ] Quick links work

### Features
- [ ] Resume analysis works
- [ ] Job analyzer works
- [ ] Match score works
- [ ] Cover letter generation works
- [ ] Job tracker CRUD works
- [ ] Chatbot responds

### Data
- [ ] User created in Firestore
- [ ] Jobs saved to Firestore
- [ ] AI results saved
- [ ] Data persists after refresh
- [ ] Data is user-specific

### UI/UX
- [ ] Responsive on mobile
- [ ] Animations smooth
- [ ] Colors correct
- [ ] Forms validate
- [ ] Error messages appear

---

## 🌐 Environment Variables Summary

### Frontend (`frontend/.env`)
```env
# Optional: Vite config
VITE_API_URL=http://localhost:5000
```

### Node Backend (`backend-node/.env`)
```env
PORT=5000
AI_SERVICE_URL=http://127.0.0.1:8000
NODE_ENV=development
```

### FastAPI Backend (`backend-ai/.env`)
```env
OPENROUTER_API_KEY=sk_live_...
PYTHONUNBUFFERED=1
```

---

## 📊 Database Firestore Rules

For development (test mode):
```
allow read, write: if request.auth != null;
```

For production (stricter):
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /jobs/{jobId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /ai_results/{resultId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🚀 Deployment Steps (Optional)

### Frontend (Vercel)
```bash
npm install -g vercel
vercel
# Follow prompts
```

### Node Backend (Render)
1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repo
5. Set environment variables
6. Deploy

### FastAPI Backend (Heroku/Railway)
1. Create `Procfile`: `web: gunicorn main:app`
2. Push to GitHub
3. Deploy using platform GUI

---

## 💡 Pro Tips

1. **Keep terminals organized:**
   - Use separate terminals for each server
   - Label them: Frontend, Node, FastAPI

2. **Check logs regularly:**
   - Frontend: Browser console (F12)
   - Node: Terminal output
   - FastAPI: Terminal output

3. **Use Firestore Emulator (optional):**
   - Great for local development
   - Doesn't use real API calls
   - Faster testing

4. **API Testing:**
   - Use Postman or Thunder Client
   - Save requests for quick testing

5. **Code Organization:**
   - Keep commits clean
   - One feature per branch
   - Good commit messages

---

## 📞 Support Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **React Docs:** https://react.dev
- **Express.js Docs:** https://expressjs.com
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **OpenRouter Docs:** https://openrouter.ai/docs

---

## ✨ What's Next?

After setup is complete:

1. **Explore the features** - Try all modules
2. **Read the code** - Understand the structure
3. **Customize it** - Add your own features
4. **Deploy it** - Make it live
5. **Share it** - Show your portfolio

---

## 🎉 Congratulations!

Your AI Job Assistant SaaS is now fully set up and running! 

### Summary of Running Servers:
- Frontend: http://localhost:5173
- Node Backend: http://localhost:5000
- FastAPI Backend: http://localhost:8000

**Enjoy building!** 🚀

---

*Setup Guide - April 2026*
*Version: 2.0 - Professional SaaS Edition*
