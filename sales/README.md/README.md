# NimitAI Sales Signal Detector

## Features
- Transcript analysis
- AI-powered signal detection
- Buying interest detection
- Objection detection
- Coaching tips

## Tech Stack
- FastAPI
- Gemini API
- HTML/CSS/JavaScript

## Setup

1. Clone repository
2. Install dependencies

pip install -r requirements.txt

3. Create .env

GEMINI_API_KEY=your_api_key

4. Start backend

uvicorn main:app --reload

5. Open frontend

index.html

## API

POST /analyse

{
  "transcript": "..."
}