import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

/**
 * POST /api/academic-insight
 *
 * Accepts assessment data, runs Python prediction pipeline,
 * and returns the academic insight result.
 *
 * Body: { age, gender, study_hours_per_day, ... }
 * Returns: { academicScore, prediction, confidence, recommendation, strengths, weaknesses }
 */
export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json();

    // Validate that we have assessment data
    const requiredFields = [
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
    ];

    for (const field of requiredFields) {
      if (assessmentData[field] === undefined || assessmentData[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Run prediction using FastAPI ML microservice
    const mlApiUrl = process.env.ML_API_URL || "http://localhost:8000";

    const res = await fetch(`${mlApiUrl}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assessmentData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("ML microservice error status:", res.status, errorText);
      return NextResponse.json(
        { error: `ML microservice prediction failed: ${errorText}` },
        { status: 500 }
      );
    }

    const prediction = await res.json();

    if (prediction.error) {
      return NextResponse.json(
        { error: prediction.error },
        { status: 500 }
      );
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error("Academic insight API error:", error);
    return NextResponse.json(
      { error: "Failed to generate academic insight" },
      { status: 500 }
    );
  }
}
