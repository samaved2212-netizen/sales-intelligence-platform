import pandas as pd
import numpy as np

def predict_sales(data):

    if not data:
        return {"error": "No data"}

    df = pd.DataFrame(data)

    df["day_index"] = np.arange(len(df))

    # Simple trend prediction
    slope = np.polyfit(df["day_index"], df["sales"], 1)[0]

    future_7 = df["sales"].mean() + slope * 7
    future_30 = df["sales"].mean() + slope * 30

    return {
        "7_day_prediction": round(future_7, 2),
        "30_day_prediction": round(future_30, 2),
        "trend": "UPWARD" if slope > 0 else "DOWNWARD"
    }