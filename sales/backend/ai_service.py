import google.generativeai as genai
import json
import os
from prompts import (
    TRANSCRIPT_ANALYSIS_PROMPT,
    SALES_ANALYSIS_PROMPT,
    INSIGHTS_PROMPT,
    CHAT_PROMPT
)

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in environment variables")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def _call_gemini(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        return response.text

    def _safe_json(self, text: str) -> dict:
        """Safely parse JSON, stripping markdown fences if present."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        return json.loads(text)

    async def analyse_transcript(self, transcript: str) -> dict:
        prompt = TRANSCRIPT_ANALYSIS_PROMPT + transcript
        raw = self._call_gemini(prompt)
        return self._safe_json(raw)

    async def process_sales_data(self, data: list) -> dict:
        total = sum(row.get("sales", 0) for row in data)
        products = {}
        for row in data:
            p = row.get("product", "Unknown")
            products[p] = products.get(p, 0) + row.get("sales", 0)
        return {
            "total_revenue": total,
            "products": products,
            "record_count": len(data)
        }

    async def analyze_sales_signals(self, data: list, period: str = "monthly") -> dict:
        summary = self._summarize_data(data)
        prompt = SALES_ANALYSIS_PROMPT + json.dumps(summary, indent=2)
        raw = self._call_gemini(prompt)
        result = self._safe_json(raw)
        result["alerts"] = self._rule_based_alerts(data)
        result["product_breakdown"] = self._product_breakdown(data)
        result["customer_signals"] = self._customer_signals(data)
        result["chart_data"] = self._build_chart_data(data)
        return result

    async def generate_insights(self, data: list) -> dict:
        summary = self._summarize_data(data)
        prompt = INSIGHTS_PROMPT + json.dumps(summary, indent=2)
        raw = self._call_gemini(prompt)
        return self._safe_json(raw)

    async def chat_with_data(self, question: str, context: str = None) -> str:
        ctx = context if context else "No sales data currently loaded."
        prompt = CHAT_PROMPT.format(context=ctx, question=question)
        return self._call_gemini(prompt)

    # ─── Helpers ───────────────────────────────────────────────────────────────

    def _summarize_data(self, data: list) -> dict:
        if not data:
            return {}
        total = sum(r.get("sales", 0) for r in data)
        by_product = {}
        by_date = {}
        by_region = {}
        for r in data:
            p = r.get("product", "Unknown")
            d = r.get("date", "Unknown")
            region = r.get("region", "Unknown")
            by_product[p] = by_product.get(p, 0) + r.get("sales", 0)
            by_date[d] = by_date.get(d, 0) + r.get("sales", 0)
            by_region[region] = by_region.get(region, 0) + r.get("sales", 0)

        sorted_dates = sorted(by_date.items())
        return {
            "total_revenue": total,
            "records": len(data),
            "by_product": by_product,
            "by_region": by_region,
            "date_range": {
                "start": sorted_dates[0][0] if sorted_dates else None,
                "end": sorted_dates[-1][0] if sorted_dates else None
            },
            "daily_trend": [{"date": d, "sales": s} for d, s in sorted_dates[-14:]]
        }

    def _rule_based_alerts(self, data: list) -> list:
        alerts = []
        by_date = {}
        for r in data:
            d = r.get("date")
            by_date[d] = by_date.get(d, 0) + r.get("sales", 0)

        values = list(by_date.values())
        if len(values) < 2:
            return alerts

        avg = sum(values) / len(values)
        for date, val in by_date.items():
            if val > avg * 1.5:
                alerts.append({"type": "spike", "date": date, "message": f"Revenue spike on {date}: ${val:,.0f} (150%+ above average)", "severity": "high"})
            elif val < avg * 0.5:
                alerts.append({"type": "drop", "date": date, "message": f"Revenue drop on {date}: ${val:,.0f} (50%+ below average)", "severity": "high"})
        return alerts[:5]

    def _product_breakdown(self, data: list) -> list:
        by_product = {}
        for r in data:
            p = r.get("product", "Unknown")
            if p not in by_product:
                by_product[p] = {"product": p, "revenue": 0, "units": 0, "category": r.get("category", "")}
            by_product[p]["revenue"] += r.get("sales", 0)
            by_product[p]["units"] += r.get("units", 0)

        total = sum(p["revenue"] for p in by_product.values())
        result = []
        for p in by_product.values():
            p["share"] = round((p["revenue"] / total * 100) if total > 0 else 0, 1)
            result.append(p)
        return sorted(result, key=lambda x: x["revenue"], reverse=True)

    def _customer_signals(self, data: list) -> dict:
        customer_purchases = {}
        for r in data:
            c = r.get("customer", "Unknown")
            if c not in customer_purchases:
                customer_purchases[c] = {"count": 0, "total": 0}
            customer_purchases[c]["count"] += 1
            customer_purchases[c]["total"] += r.get("sales", 0)

        repeat_buyers = [c for c, v in customer_purchases.items() if v["count"] > 1]
        high_value = sorted(customer_purchases.items(), key=lambda x: x[1]["total"], reverse=True)[:5]
        return {
            "repeat_buyers": len(repeat_buyers),
            "total_customers": len(customer_purchases),
            "high_value": [{"customer": c, "total": v["total"], "orders": v["count"]} for c, v in high_value]
        }

    def _build_chart_data(self, data: list) -> dict:
        by_date = {}
        by_product = {}
        for r in data:
            d = r.get("date", "")[:7]
            p = r.get("product", "Unknown")
            by_date[d] = by_date.get(d, 0) + r.get("sales", 0)
            by_product[p] = by_product.get(p, 0) + r.get("sales", 0)

        sorted_dates = sorted(by_date.items())
        return {
            "trend": {"labels": [d[0] for d in sorted_dates], "values": [d[1] for d in sorted_dates]},
            "products": {"labels": list(by_product.keys()), "values": list(by_product.values())}
        }