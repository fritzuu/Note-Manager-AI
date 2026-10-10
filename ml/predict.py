"""Classify a validated v2 profile; habit scores and notes belong to the web rules."""
import json
import os
import sys
from functools import lru_cache
import joblib
import numpy as np
import pandas as pd
from profile_contract import FEATURE_COLS, StudentAssessment

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@lru_cache(maxsize=1)
def load_artifacts():
    model = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
    encoder = joblib.load(os.path.join(BASE_DIR, "encoder.pkl"))
    scaler = joblib.load(os.path.join(BASE_DIR, "scaler.pkl"))
    path = os.path.join(BASE_DIR, "model_metadata.json")
    metadata = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as file:
            metadata = json.load(file)
        if metadata.get("schemaVersion") != 2 or metadata.get("features") != FEATURE_COLS:
            raise ValueError("Model feature contract does not match the service")
    return model, encoder, scaler, metadata


def predict_student_performance(data: dict) -> dict:
    profile = StudentAssessment(**data).dict()
    model, encoder, scaler, metadata = load_artifacts()
    frame = pd.DataFrame([[profile[key] for key in FEATURE_COLS]], columns=FEATURE_COLS)
    scaled = scaler.transform(frame)
    encoded = model.predict(scaled)[0]
    label = str(encoder.inverse_transform([encoded])[0])
    probabilities = model.predict_proba(scaled)[0]
    confidence = float(np.max(probabilities)) * 100
    if label not in {"Low", "Average", "Good", "Excellent"} or not np.isfinite(confidence):
        raise ValueError("Invalid model output")
    return {
        "prediction": label,
        "confidence": round(confidence, 1),
        "modelVersion": metadata.get("modelVersion", "legacy-artifact-unversioned"),
        "schemaVersion": 2,
        "confidenceCalibrated": False,
    }


def main():
    try:
        print(json.dumps(predict_student_performance(json.loads(sys.stdin.read()))))
    except Exception as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
