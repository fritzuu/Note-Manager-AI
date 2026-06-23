"""
MindFlow AI — ML Training Pipeline
====================================
Trains a Random Forest Classifier on the Student Habits vs Academic Performance dataset.

Outputs:
  - model.pkl   (trained RandomForestClassifier)
  - encoder.pkl (LabelEncoder for performance_label)
  - scaler.pkl  (StandardScaler for features)
"""

import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)  # AI-Project/mindflow-ai
DATASET_PATH = os.path.join(os.path.dirname(PROJECT_DIR), "cleaned_student_dataset.csv")

MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

# ── Feature columns (must match assessment form) ──────────────────────────────
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

TARGET_COL = "performance_label"

# ── Canonical label mapping ───────────────────────────────────────────────────
# The dataset uses labels like "Low (<50)", "Average (50-64)", etc.
# We map them to clean labels for the app.
LABEL_MAP = {
    "Low (<50)": "Low",
    "Average (50-64)": "Average",
    "Good (65-79)": "Good",
    "Excellent (≥80)": "Excellent",
}


def main() -> None:
    print("=" * 60)
    print("  MindFlow AI — Model Training Pipeline")
    print("=" * 60)

    # ── 1. Load dataset ───────────────────────────────────────────────────────
    if not os.path.exists(DATASET_PATH):
        print(f"\n❌ Dataset not found at:\n   {DATASET_PATH}")
        sys.exit(1)

    df = pd.read_csv(DATASET_PATH)
    print(f"\n📊 Dataset loaded: {df.shape[0]} rows × {df.shape[1]} columns")

    # ── 2. Clean labels ───────────────────────────────────────────────────────
    df[TARGET_COL] = df[TARGET_COL].map(LABEL_MAP)
    df = df.dropna(subset=[TARGET_COL])
    print(f"   Classes: {df[TARGET_COL].value_counts().to_dict()}")

    # ── 3. Features & target ──────────────────────────────────────────────────
    X = df[FEATURE_COLS].copy()
    y = df[TARGET_COL].copy()

    # ── 4. Encode target ──────────────────────────────────────────────────────
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    print(f"   Label mapping: {dict(zip(encoder.classes_, encoder.transform(encoder.classes_)))}")

    # ── 5. Scale features ─────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── 6. Train / Test split ─────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"\n🔀 Split: {len(X_train)} train / {len(X_test)} test")

    # ── 7. Train Random Forest ────────────────────────────────────────────────
    print("\n🌲 Training Random Forest Classifier...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # ── 8. Evaluate ───────────────────────────────────────────────────────────
    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted")
    recall = recall_score(y_test, y_pred, average="weighted")
    f1 = f1_score(y_test, y_pred, average="weighted")

    print("\n" + "─" * 40)
    print("  📈 Model Evaluation Results")
    print("─" * 40)
    print(f"  Accuracy  : {accuracy:.4f}")
    print(f"  Precision : {precision:.4f}")
    print(f"  Recall    : {recall:.4f}")
    print(f"  F1 Score  : {f1:.4f}")
    print("─" * 40)

    print("\n📋 Classification Report:\n")
    print(classification_report(y_test, y_pred, target_names=encoder.classes_))

    # ── 9. Feature importance ─────────────────────────────────────────────────
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("🔑 Feature Importance (top 5):")
    for i in range(min(5, len(FEATURE_COLS))):
        idx = sorted_idx[i]
        print(f"   {i + 1}. {FEATURE_COLS[idx]:30s} {importances[idx]:.4f}")

    # ── 10. Save artifacts ────────────────────────────────────────────────────
    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    joblib.dump(scaler, SCALER_PATH)

    print(f"\n✅ Saved model   → {MODEL_PATH}")
    print(f"✅ Saved encoder → {ENCODER_PATH}")
    print(f"✅ Saved scaler  → {SCALER_PATH}")
    print("\n🎉 Training complete!\n")


if __name__ == "__main__":
    main()
