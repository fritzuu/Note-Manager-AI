import os
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

# Load artifacts once at startup
try:
    model = joblib.load(MODEL_PATH)
    encoder = joblib.load(ENCODER_PATH)
    scaler = joblib.load(SCALER_PATH)
except Exception as e:
    raise RuntimeError(f"Failed to load ML artifacts: {str(e)}")

app = FastAPI(title="MindFlow AI ML Microservice", version="1.0.0")

class StudentAssessment(BaseModel):
    age: float
    gender: float
    study_hours_per_day: float
    social_media_hours: float
    netflix_hours: float
    part_time_job: float
    attendance_percentage: float
    sleep_hours: float
    diet_quality: float
    exercise_frequency: float
    parental_education_level: float
    internet_quality: float
    mental_health_rating: float
    extracurricular_participation: float

FEATURE_COLS = [
    "age",
    "gender",
    "study_hours_per_day",
    "social_media_hours",
    "netflix_hours",
    "part_time_job",
    "attendance_percentage",
    "sleep_hours",
    "diet_quality",
    "exercise_frequency",
    "parental_education_level",
    "internet_quality",
    "mental_health_rating",
    "extracurricular_participation",
]

RECOMMENDATIONS = {
    "Low": "You need to improve study consistency and attendance.",
    "Average": "Your performance is stable but can be improved with better study habits.",
    "Good": "You are performing well. Maintain your current learning habits.",
    "Excellent": "Excellent performance. Continue your current study routine.",
}

SCORE_RANGES = {
    "Low": (15, 40),
    "Average": (45, 64),
    "Good": (65, 79),
    "Excellent": (80, 98),
}

@app.get("/")
def read_root():
    return {"message": "MindFlow AI ML Microservice is running!"}

@app.post("/predict")
def predict(student: StudentAssessment):
    try:
        # Build features array in exact training order
        data_dict = student.dict()
        features = [float(data_dict[col]) for col in FEATURE_COLS]
        
        import pandas as pd
        feature_df = pd.DataFrame([features], columns=FEATURE_COLS)
        scaled = scaler.transform(feature_df)
        
        # Predict
        prediction_encoded = model.predict(scaled)[0]
        probabilities = model.predict_proba(scaled)[0]
        
        prediction_label = encoder.inverse_transform([prediction_encoded])[0]
        confidence = float(np.max(probabilities)) * 100
        
        # Compute academic score
        score_min, score_max = SCORE_RANGES.get(prediction_label, (50, 75))
        academic_score = round(score_min + (score_max - score_min) * (confidence / 100), 1)
        
        recommendation = RECOMMENDATIONS.get(prediction_label, "")
        
        # Analyze strengths and weaknesses
        strengths = []
        weaknesses = []
        
        if data_dict["study_hours_per_day"] >= 4:
            strengths.append("Strong study dedication")
        elif data_dict["study_hours_per_day"] < 2:
            weaknesses.append("Low study hours — aim for at least 3-4 hours daily")
            
        if data_dict["attendance_percentage"] >= 85:
            strengths.append("Excellent class attendance")
        elif data_dict["attendance_percentage"] < 70:
            weaknesses.append("Low attendance — try to attend at least 85% of classes")
            
        if data_dict["sleep_hours"] >= 7:
            strengths.append("Healthy sleep schedule")
        elif data_dict["sleep_hours"] < 6:
            weaknesses.append("Insufficient sleep — aim for 7-8 hours per night")
            
        if data_dict["mental_health_rating"] >= 7:
            strengths.append("Good mental wellbeing")
        elif data_dict["mental_health_rating"] <= 4:
            weaknesses.append("Mental health needs attention — consider counseling resources")
            
        if data_dict["exercise_frequency"] >= 3:
            strengths.append("Active physical lifestyle")
        elif data_dict["exercise_frequency"] == 0:
            weaknesses.append("No exercise — even 2-3 sessions per week can boost focus")
            
        if data_dict["social_media_hours"] <= 2:
            strengths.append("Controlled screen time")
        elif data_dict["social_media_hours"] > 4:
            weaknesses.append("High social media usage — try limiting to 2 hours daily")
            
        if data_dict["diet_quality"] >= 4:
            strengths.append("Good dietary habits")
        elif data_dict["diet_quality"] <= 2:
            weaknesses.append("Poor diet quality — balanced nutrition improves concentration")
            
        if data_dict["extracurricular_participation"] == 1:
            strengths.append("Active in extracurricular activities")
            
        if data_dict["internet_quality"] >= 4:
            strengths.append("Good internet connectivity for learning")
        elif data_dict["internet_quality"] <= 2:
            weaknesses.append("Poor internet — consider campus/library resources")
            
        if not strengths:
            strengths.append("Willingness to improve through self-assessment")
        if not weaknesses:
            weaknesses.append("Maintain your current habits to stay on track")
            
        return {
            "academicScore": academic_score,
            "prediction": prediction_label,
            "confidence": round(confidence, 1),
            "recommendation": recommendation,
            "strengths": strengths,
            "weaknesses": weaknesses,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
