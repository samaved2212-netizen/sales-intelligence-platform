from fastapi import APIRouter, UploadFile, File
import pandas as pd
from analysis import analyze_data, generate_insights
from ml_model import predict_sales

router = APIRouter()

DATA_STORE = []

@router.post("/upload-data")
async def upload(file: UploadFile = File(...)):
    global DATA_STORE
    df = pd.read_csv(file.file)
    DATA_STORE = df.to_dict(orient="records")
    return {"message": "File uploaded", "rows": len(DATA_STORE)}

@router.post("/analyze")
def analyze():
    return analyze_data(DATA_STORE)

@router.get("/get-insights")
def insights():
    return generate_insights(DATA_STORE)

@router.get("/predict")
def predict():
    return predict_sales(DATA_STORE)