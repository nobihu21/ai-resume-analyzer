from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import json
from typing import List
from dotenv import load_dotenv

# ============================================
# 1. Load environment variables
# ============================================
load_dotenv()

# ============================================
# 2. Validate API key from .env
# ============================================
api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    print("CRITICAL ERROR: OPENROUTER_API_KEY is not set in .env file!")
else:
    print("SUCCESS: OpenRouter API Key loaded successfully.")

# ============================================
# 3. Initialize OpenRouter client (OpenAI-compatible)
# ============================================
client = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1"
)

# Model to use via OpenRouter (free & stable)
MODEL = "openai/gpt-3.5-turbo"

# ============================================
# 4. FastAPI App Setup
# ============================================
app = FastAPI(title="AI Job Assistant - AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 5. Request Models
# ============================================
class ResumeAnalysisRequest(BaseModel):
    resume_text: str

class JobAnalysisRequest(BaseModel):
    job_description: str

class MatchRequest(BaseModel):
    resume_text: str
    job_description: str

class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    userId: str = None

# ============================================
# Helper: Call OpenRouter and return parsed JSON
# ============================================
def call_openrouter(prompt: str, endpoint_name: str, system_message: str = None) -> dict:
    """
    Sends a prompt to OpenRouter, parses the JSON response, 
    and returns a Python dict. Logs everything for debugging.
    """
    print(f"\n--- [{endpoint_name}] Sending request to OpenRouter ---")
    print(f"Prompt length: {len(prompt)} chars")

    system_msg = system_message or "You are a helpful assistant. You MUST respond with valid JSON only. No markdown, no explanation, no extra text."

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_msg
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=2000,
            temperature=0.7
        )

        raw_content = response.choices[0].message.content
        print(f"--- [{endpoint_name}] Raw response length: {len(raw_content)} chars ---")

        if not raw_content:
            return {"error": "Empty response from AI"}

        # Clean response: strip markdown code fences if model wraps in ```json
        cleaned = raw_content.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)

        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {str(e)}")
        return {"error": f"Invalid JSON response: {str(e)}"}
    except Exception as e:
        print(f"OpenRouter Error: {str(e)}")
        return {"error": f"API Error: {str(e)}"}

def call_openrouter_text(prompt: str, endpoint_name: str, system_message: str = None) -> str:
    """Call OpenRouter and return plain text response (not JSON)"""
    print(f"\n--- [{endpoint_name}] Sending request to OpenRouter ---")
    print(f"Prompt length: {len(prompt)} chars")

    system_msg = system_message or "You are a helpful career assistant providing advice on job search, resumes, interviews, and career development."

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_msg
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=1500,
            temperature=0.7
        )

        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenRouter Error: {str(e)}")
        return f"I apologize, but I encountered an error: {str(e)}"

# ============================================
# 6. Endpoints
# ============================================

@app.post("/analyze-resume")
async def analyze_resume(req: ResumeAnalysisRequest):
    """Analyze resume for ATS optimization"""
    resume_text = req.resume_text if req.resume_text else ""
    print(f"[/analyze-resume] Received resume text: {len(resume_text)} chars")

    if len(resume_text) < 50:
        return {"error": "Resume text too short", "score": 0, "missing_keywords": [], "suggestions": []}

    prompt = f"""You are an expert ATS (Applicant Tracking System) specialist. Analyze this resume comprehensively.

RESUME:
{resume_text}

Analyze and return ONLY valid JSON with these fields:
- score: number 0-100 (0=poor, 100=perfect for ATS)
- missing_keywords: array of important industry keywords not found (max 8)
- suggestions: array of 3-4 specific, actionable improvement suggestions

Focus on ATS optimization, missing industry terms, and formatting issues.

JSON FORMAT ONLY:
{{"score": 75, "missing_keywords": ["Kubernetes", "AWS"], "suggestions": ["Add metrics to achievements", "Use standard section headers"]}}"""

    try:
        result = call_openrouter(prompt, "/analyze-resume")
        if "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error"))
        return result
    except Exception as e:
        print(f"ERROR in /analyze-resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")


@app.post("/analyze-job")
async def analyze_job(req: JobAnalysisRequest):
    """Analyze job description"""
    job_description = req.job_description if req.job_description else ""
    print(f"[/analyze-job] Received JD text: {len(job_description)} chars")

    if len(job_description) < 50:
        return {"error": "Job description too short", "skills": [], "requirements": [], "keywords": []}

    prompt = f"""You are an expert recruiter and job analyst. Extract and analyze this job posting.

JOB DESCRIPTION:
{job_description}

Extract and return ONLY valid JSON with:
- skills: array of top 6-8 technical/soft skills required
- requirements: array of 4-5 key requirements (education, experience, etc)
- keywords: array of important industry/role keywords for ATS (max 8)

JSON FORMAT ONLY:
{{"skills": ["Python", "AWS", "Leadership"], "requirements": ["5+ years experience", "BS in CS"], "keywords": ["Cloud Engineer", "DevOps"]}}"""

    try:
        result = call_openrouter(prompt, "/analyze-job")
        if "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error"))
        return result
    except Exception as e:
        print(f"ERROR in /analyze-job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Job analysis failed: {str(e)}")


@app.post("/match-score")
async def match_score(req: MatchRequest):
    """Calculate match percentage between resume and job"""
    print(f"[/match-score] Resume: {len(req.resume_text)} chars, JD: {len(req.job_description)} chars")

    if len(req.resume_text) < 50 or len(req.job_description) < 50:
        return {"error": "Invalid input", "match_percentage": 0, "missing_skills": [], "explanation": ""}

    prompt = f"""You are an expert career counselor. Compare this resume against the job description.

RESUME:
{req.resume_text}

JOB DESCRIPTION:
{req.job_description}

Analyze fit and return ONLY valid JSON:
- match_percentage: number 0-100
- missing_skills: array of 3-5 skills they should develop
- explanation: 2-3 sentences explaining the match

JSON FORMAT ONLY:
{{"match_percentage": 82, "missing_skills": ["Kubernetes", "Go Programming"], "explanation": "Strong backend skills but lacks cloud orchestration experience. Soft skills align well with team lead role."}}"""

    try:
        result = call_openrouter(prompt, "/match-score")
        if "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error"))
        return result
    except Exception as e:
        print(f"ERROR in /match-score: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Match calculation failed: {str(e)}")


@app.post("/generate-cover-letter")
async def generate_cover_letter(req: CoverLetterRequest):
    """Generate professional personalized cover letter (150-250 words)"""
    print(f"[/generate-cover-letter] Resume: {len(req.resume_text)} chars, JD: {len(req.job_description)} chars")

    if len(req.resume_text) < 50 or len(req.job_description) < 50:
        return {"error": "Invalid input", "cover_letter": ""}

    prompt = f"""You are a professional career coach writing cover letters. Create a compelling, personalized cover letter.

CANDIDATE'S RESUME:
{req.resume_text}

TARGET JOB DESCRIPTION:
{req.job_description}

Write a professional cover letter with:
1. Strong opening paragraph (2-3 sentences) expressing genuine interest
2. Middle paragraph (3-4 sentences) highlighting 2-3 specific skills/achievements that match the job
3. Closing paragraph (2 sentences) with strong call to action

Requirements:
- Total length: 150-250 words
- Professional, enthusiastic tone
- Personalized (mention specific company/role details from JD)
- Use specific achievements with metrics when possible
- NO generic/template language
- Start with "Dear Hiring Manager," format
- End with professional closing

Return ONLY the complete cover letter text (not JSON, just plain text)."""

    try:
        result = call_openrouter_text(prompt, "/generate-cover-letter")
        return {"cover_letter": result}
    except Exception as e:
        print(f"ERROR in /generate-cover-letter: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")


@app.post("/chat")
async def chat(req: ChatRequest):
    """AI career assistant chat endpoint"""
    print(f"[/chat] Messages count: {len(req.messages)}")

    if not req.messages:
        return {"error": "No messages provided"}

    # Build conversation
    messages = [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in req.messages
    ]

    system_prompt = """You are an expert AI career assistant helping with:
- Resume optimization and ATS improvement
- Interview preparation and common questions
- Career growth and development strategies
- Job search tactics and networking
- Salary negotiation advice
- Industry insights and trends

Provide concise, actionable, professional advice. Be encouraging but honest. 
If you don't know something, say so. Aim for responses of 2-4 paragraphs unless asked for more detail."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            max_tokens=1000,
            temperature=0.7
        )

        assistant_message = response.choices[0].message.content
        return {"response": assistant_message}
    except Exception as e:
        print(f"ERROR in /chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "AI Job Assistant"}


# ============================================
# 7. Run the server
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
