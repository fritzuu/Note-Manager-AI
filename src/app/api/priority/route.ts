import { NextRequest, NextResponse } from "next/server";
import { computePriority, type FuzzyInputs } from "@/lib/fuzzyLogic";

/**
 * POST /api/priority
 *
 * Accepts task parameters, runs the Mamdani Fuzzy Logic engine,
 * and returns the computed priority result.
 *
 * Body: { deadlineDays, importance, difficulty, progress, academicRisk }
 * Returns: { priorityScore, priorityLevel, riskLevel, estimatedTotalMinutes, reasoning }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields: Array<keyof FuzzyInputs> = [
      "deadlineDays",
      "importance",
      "difficulty",
      "progress",
      "academicRisk",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
      if (typeof body[field] !== "number") {
        return NextResponse.json(
          { error: `Field '${field}' must be a number` },
          { status: 400 }
        );
      }
    }

    const inputs: FuzzyInputs = {
      deadlineDays: body.deadlineDays,
      importance:   body.importance,
      difficulty:   body.difficulty,
      progress:     body.progress,
      academicRisk: body.academicRisk,
    };

    const result = computePriority(inputs);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Priority API error:", error);
    return NextResponse.json(
      { error: "Failed to compute priority" },
      { status: 500 }
    );
  }
}
