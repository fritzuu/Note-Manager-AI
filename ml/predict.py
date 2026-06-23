"""
MindFlow AI — Prediction Pipeline
===================================
Loads the trained model and predicts student academic performance.

Usage:
  echo '{"age":20,...}' | python3 predict.py
  → outputs JSON result to stdout
"""

import json
import os
import sys

import joblib
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

# ── Feature order (must match training) ───────────────────────────────────────
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

# ── Business rules ────────────────────────────────────────────────────────────
RECOMMENDATIONS = {
    "Low": "You need to improve study consistency and attendance.",
    "Average": "Your performance is stable but can be improved with better study habits.",
    "Good": "You are performing well. Maintain your current learning habits.",
    "Excellent": "Excellent performance. Continue your current study routine.",
}

# Score ranges per category
SCORE_RANGES = {
    "Low": (15, 40),
    "Average": (45, 64),
    "Good": (65, 79),
    "Excellent": (80, 98),
}


def load_artifacts():
    """Load model, encoder, and scaler from disk."""
    model = joblib.load(MODEL_PATH)
    encoder = joblib.load(ENCODER_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, encoder, scaler


def predict_student_performance(data: dict) -> dict:
    """
    Predict a student's academic performance.

    Args:
        data: dict with keys matching FEATURE_COLS

    Returns:
        dict with academicScore, prediction, confidence, recommendation,
             strengths, weaknesses
    """
    model, encoder, scaler = load_artifacts()

    # Build feature vector in the correct order
    features = []
    for col in FEATURE_COLS:
        val = data.get(col, 0)
        features.append(float(val))

    feature_array = np.array([features])
    scaled = scaler.transform(feature_array)

    # Predict
    prediction_encoded = model.predict(scaled)[0]
    probabilities = model.predict_proba(scaled)[0]

    prediction_label = encoder.inverse_transform([prediction_encoded])[0]
    confidence = float(np.max(probabilities)) * 100

    # Compute academic score within the category range, weighted by confidence
    score_min, score_max = SCORE_RANGES.get(prediction_label, (50, 75))
    academic_score = round(score_min + (score_max - score_min) * (confidence / 100), 1)

    recommendation = RECOMMENDATIONS.get(prediction_label, "")

    # Analyze strengths and weaknesses from the input data
    strengths = []
    weaknesses = []

    if data.get("study_hours_per_day", 0) >= 4:
        strengths.append("Strong study dedication")
    elif data.get("study_hours_per_day", 0) < 2:
        weaknesses.append("Low study hours — aim for at least 3-4 hours daily")

    if data.get("attendance_percentage", 0) >= 85:
        strengths.append("Excellent class attendance")
    elif data.get("attendance_percentage", 0) < 70:
        weaknesses.append("Low attendance — try to attend at least 85% of classes")

    if data.get("sleep_hours", 0) >= 7:
        strengths.append("Healthy sleep schedule")
    elif data.get("sleep_hours", 0) < 6:
        weaknesses.append("Insufficient sleep — aim for 7-8 hours per night")

    if data.get("mental_health_rating", 0) >= 7:
        strengths.append("Good mental wellbeing")
    elif data.get("mental_health_rating", 0) <= 4:
        weaknesses.append("Mental health needs attention — consider counseling resources")

    if data.get("exercise_frequency", 0) >= 3:
        strengths.append("Active physical lifestyle")
    elif data.get("exercise_frequency", 0) == 0:
        weaknesses.append("No exercise — even 2-3 sessions per week can boost focus")

    if data.get("social_media_hours", 0) <= 2:
        strengths.append("Controlled screen time")
    elif data.get("social_media_hours", 0) > 4:
        weaknesses.append("High social media usage — try limiting to 2 hours daily")

    if data.get("diet_quality", 0) >= 4:
        strengths.append("Good dietary habits")
    elif data.get("diet_quality", 0) <= 2:
        weaknesses.append("Poor diet quality — balanced nutrition improves concentration")

    if data.get("extracurricular_participation", 0) == 1:
        strengths.append("Active in extracurricular activities")

    if data.get("internet_quality", 0) >= 4:
        strengths.append("Good internet connectivity for learning")
    elif data.get("internet_quality", 0) <= 2:
        weaknesses.append("Poor internet — consider campus/library resources")

    # Ensure at least one strength and weakness
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


def main():
    """Read JSON from stdin, predict, output JSON to stdout."""
    try:
        input_data = json.loads(sys.stdin.read())
        result = predict_student_performance(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
