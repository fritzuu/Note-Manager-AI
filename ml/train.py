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
import json
from datetime import datetime, timezone
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
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
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "student_habits_performance.csv")

MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

# ── Feature columns (must match assessment form) ──────────────────────────────
from profile_contract import FEATURE_COLS

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

    # Prepare labels/categories from raw data without global imputation or scaling.
    # Exam scores determine class labels only and are never input features.
    df[TARGET_COL] = pd.cut(
        pd.to_numeric(df["exam_score"], errors="coerce"),
        bins=[-np.inf, 50, 65, 80, np.inf], labels=["Low", "Average", "Good", "Excellent"],
        right=False,
    )
    binary = {"Yes": 1, "No": 0, "Male": 1, "Female": 0}
    for column in ["gender", "part_time_job", "extracurricular_participation"]:
        df[column] = df[column].map(binary)
    df["diet_quality"] = df["diet_quality"].map({"Poor": 0, "Fair": 1, "Good": 2, "Excellent": 3})
    df["internet_quality"] = df["internet_quality"].map({"Poor": 0, "Average": 1, "Good": 2})
    df["parental_education_level"] = df["parental_education_level"].map({"High School": 0, "Bachelor": 1, "Master": 2, "PhD": 3})
    # Never invent binary gender values for unknown categories.
    df = df.dropna(subset=[TARGET_COL, "gender", "part_time_job", "extracurricular_participation", "diet_quality", "internet_quality"])
    X = df[FEATURE_COLS].apply(pd.to_numeric, errors="coerce")
    y = df[TARGET_COL].astype(str)

    # ── 4. Encode target ──────────────────────────────────────────────────────
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    print(f"   Label mapping: {dict(zip(encoder.classes_, encoder.transform(encoder.classes_)))}")

    # Split before fitting preprocessing: test rows never determine scaling.
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    # Fill missing values using training rows only. Retain these values as metadata.
    fill_values = X_train_raw.median().to_dict()
    fill_values["parental_education_level"] = float(X_train_raw["parental_education_level"].mode().iloc[0])
    X_train_raw = X_train_raw.fillna(fill_values)
    X_test_raw = X_test_raw.fillna(fill_values)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)
    print(f"Split: {len(X_train)} train / {len(X_test)} test")

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
    # Save evidence and input meanings alongside newly trained artifacts.
    metadata = {
        "schemaVersion": 2,
        "modelVersion": "random-forest-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
        "features": FEATURE_COLS,
        "categories": {"gender": {"Female": 0, "Male": 1}, "diet_quality": {"Poor": 0, "Fair": 1, "Good": 2, "Excellent": 3}, "internet_quality": {"Poor": 0, "Average": 1, "Good": 2}, "parental_education_level": {"High School": 0, "Bachelor": 1, "Master": 2, "PhD": 3}},
        "confidenceCalibrated": False,
        "evaluationScope": "holdout_split_before_imputation_and_scaling",
        "trainingFillValues": fill_values,
        "metrics": {"accuracy": float(accuracy), "precision": float(precision), "recall": float(recall), "f1": float(f1)},
        "classLabels": encoder.classes_.tolist(),
        "confusionMatrix": confusion_matrix(y_test, y_pred).tolist(),
    }
    with open(os.path.join(BASE_DIR, "model_metadata.json"), "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2)

    print(f"\n✅ Saved model   → {MODEL_PATH}")
    print(f"✅ Saved encoder → {ENCODER_PATH}")
    print(f"✅ Saved scaler  → {SCALER_PATH}")
    print("\n🎉 Training complete!\n")


if __name__ == "__main__":
    main()
