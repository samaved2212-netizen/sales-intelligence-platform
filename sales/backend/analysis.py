import pandas as pd
from collections import defaultdict

def analyze_data(data):

    if not data:
        return {"error": "No data uploaded"}

    df = pd.DataFrame(data)

    total_sales = df["sales"].sum()
    avg_sales = df["sales"].mean()

    product_perf = df.groupby("product")["sales"].sum().to_dict()

    signals = []

    for i in range(len(df)):
        if df.iloc[i]["sales"] > avg_sales:
            signals.append("POSITIVE")
        else:
            signals.append("NEGATIVE")

    return {
        "total_sales": int(total_sales),
        "average_sales": float(avg_sales),
        "product_performance": product_perf,
        "signals": signals
    }


def generate_insights(data):

    if not data:
        return {"insights": []}

    df = pd.DataFrame(data)

    insights = []

    if df["sales"].mean() > 1000:
        insights.append("Sales are performing strongly due to high demand.")

    if df["sales"].min() < 300:
        insights.append("Some products are underperforming and need attention.")

    top_product = df.groupby("product")["sales"].sum().idxmax()
    insights.append(f"{top_product} is the best performing product.")

    return {"insights": insights}