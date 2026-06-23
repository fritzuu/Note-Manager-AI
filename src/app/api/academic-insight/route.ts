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

    // Run Python prediction
    const predictScript = path.join(process.cwd(), "ml", "predict.py");
    const inputJson = JSON.stringify(assessmentData);

    const result = await new Promise<string>((resolve, reject) => {
      const child = execFile(
        "python",
        [predictScript],
        { timeout: 15000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error("Python prediction error:", error.message);
            console.error("stderr:", stderr);
            reject(new Error(`Prediction failed: ${error.message}`));
            return;
          }
          resolve(stdout.trim());
        }
      );

      // Send assessment data to stdin
      if (child.stdin) {
        child.stdin.write(inputJson);
        child.stdin.end();
      }
    });

    const prediction = JSON.parse(result);

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
