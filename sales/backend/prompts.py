TRANSCRIPT_ANALYSIS_PROMPT = """
Analyze the sales call transcript below.

Return ONLY valid JSON in this format:

{
  "signals": [
    {
      "type": "buying_interest",
      "quote": "",
      "tip": "",
      "confidence": 90
    }
  ],
  "overall_sentiment": "positive",
  "deal_score": 75,
  "summary": ""
}

Transcript:
"""

SALES_ANALYSIS_PROMPT = """
Analyze the following sales dataset summary.

Return ONLY valid JSON:

{
  "total_revenue": 0,
  "top_product": "",
  "worst_product": "",
  "signals": [],
  "recommendations": []
}

Data:
"""

INSIGHTS_PROMPT = """
Generate business insights from the following sales data.

Return ONLY valid JSON:

{
  "executive_summary": "",
  "insights": [
    {
      "title": "",
      "description": "",
      "impact": "positive",
      "priority": "high"
    }
  ],
  "key_metrics": {},
  "predictions": []
}

Data:
"""

CHAT_PROMPT = """
You are a sales intelligence assistant.

Context:
{context}

Question:
{question}

Answer:
"""