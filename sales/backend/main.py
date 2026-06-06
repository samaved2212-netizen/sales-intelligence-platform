from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from ai_service import AIService
from datetime import datetime

app = FastAPI(title="NimitAI Sales Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_service = AIService()

# ─── Models ────────────────────────────────────────────────────────────────────

class TranscriptRequest(BaseModel):
    transcript: str

class SalesDataRequest(BaseModel):
    data: List[dict]
    period: Optional[str] = "monthly"

class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None

# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "NimitAI Sales Intelligence API is running", "version": "1.0.0"}

@app.post("/analyse")
async def analyse_transcript(request: TranscriptRequest):
    """Analyse a meeting transcript for sales signals."""
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")
    try:
        result = await ai_service.analyse_transcript(request.transcript)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-data")
async def upload_data(request: SalesDataRequest):
    """Upload and store sales data for analysis."""
    if not request.data:
        raise HTTPException(status_code=400, detail="Sales data cannot be empty")
    try:
        summary = await ai_service.process_sales_data(request.data)
        return JSONResponse(content={"status": "success", "summary": summary, "records": len(request.data)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_sales(request: SalesDataRequest):
    """Perform full signal detection on sales data."""
    if not request.data:
        raise HTTPException(status_code=400, detail="Sales data cannot be empty")
    try:
        analysis = await ai_service.analyze_sales_signals(request.data, request.period)
        return JSONResponse(content=analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-insights")
async def get_insights(request: SalesDataRequest):
    """Generate AI-powered text insights from sales data."""
    if not request.data:
        raise HTTPException(status_code=400, detail="Sales data cannot be empty")
    try:
        insights = await ai_service.generate_insights(request.data)
        return JSONResponse(content=insights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_data(request: ChatRequest):
    """ChatGPT-like interface to query your sales data."""
    try:
        answer = await ai_service.chat_with_data(request.question, request.context)
        return JSONResponse(content={"answer": answer})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sample-data")
def get_sample_data():
    """Returns sample sales data for demo purposes."""
    import random
    from datetime import timedelta

    base_date = datetime(2024, 1, 1)
    products = ["CRM Pro", "Analytics Suite", "AutoPilot", "DataSync", "LeadBot"]
    categories = ["Software", "Analytics", "Automation", "Integration", "AI Tools"]
    customers = [f"Customer_{i}" for i in range(1, 31)]

    data = []
    for i in range(90):
        date = base_date + timedelta(days=i)
        product_idx = i % len(products)
        sales = random.randint(5000, 50000) + (i * 200 if i < 60 else -(i - 60) * 100)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "product": products[product_idx],
            "category": categories[product_idx],
            "sales": max(1000, sales),
            "units": random.randint(10, 200),
            "customer": random.choice(customers),
            "region": random.choice(["North", "South", "East", "West"]),
            "rep": f"Rep_{random.randint(1,5)}"
        })
    return JSONResponse(content={"data": data})