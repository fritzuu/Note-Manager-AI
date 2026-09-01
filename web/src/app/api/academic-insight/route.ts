import { NextRequest, NextResponse } from "next/server";

interface AssessmentData {
  age: number;
  gender: number;
  study_hours_per_day: number;
  social_media_hours: number;
  netflix_hours: number;
  part_time_job: number;
  attendance_percentage: number;
  sleep_hours: number;
  diet_quality: number;
  exercise_frequency: number;
  parental_education_level: number;
  internet_quality: number;
  mental_health_rating: number;
  extracurricular_participation: number;
}

/**
 * Intelligent Fallback Heuristic Calculation (in case Python FastAPI ML service is unreachable)
 */
function computeFallbackInsight(data: AssessmentData) {
  let score = 50;

  // Study hours impact (0-10) -> up to +25 points
  score += Math.min(data.study_hours_per_day * 3.5, 25);

  // Attendance impact (0-100) -> up to +20 points
  score += ((data.attendance_percentage - 50) / 50) * 20;

  // Screen/Social media distraction impact (0-10) -> up to -15 points
  const distractionHours = (data.social_media_hours || 0) + (data.netflix_hours || 0);
  score -= Math.min(distractionHours * 1.8, 15);

  // Sleep hours (optimal: 7-9 hours)
  if (data.sleep_hours >= 7 && data.sleep_hours <= 9) {
    score += 5;
  } else if (data.sleep_hours < 6) {
    score -= 8;
  }

  // Mental health & lifestyle
  score += (data.mental_health_rating - 5) * 1.5;
  score += (data.diet_quality - 2) * 2;
  score += (data.exercise_frequency - 2) * 1.5;

  const academicScore = Math.max(10, Math.min(100, Math.round(score)));

  let prediction = "Moderate Performance";
  let confidence = 0.88;
  let recommendation =
    "Pertahankan konsistensi belajar harian dan buat jadwal teratur untuk menyeimbangkan istirahat dan tugas.";

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (data.study_hours_per_day >= 4) {
    strengths.push("Durasi belajar harian yang sangat baik");
  } else {
    weaknesses.push("Durasi belajar mandiri masih perlu ditingkatkan");
  }

  if (data.attendance_percentage >= 85) {
    strengths.push("Tingkat kehadiran kuliah tinggi dan konsisten");
  } else {
    weaknesses.push("Kehadiran perkuliahan perlu ditingkatkan");
  }

  if (distractionHours > 5) {
    weaknesses.push("Waktu layar hiburan & media sosial relatif tinggi");
  } else {
    strengths.push("Pengendalian waktu layar hiburan terkontrol dengan baik");
  }

  if (data.sleep_hours >= 7) {
    strengths.push("Pola tidur cukup mendukung pemulihan kognitif");
  } else {
    weaknesses.push("Kurang tidur dapat menurunkan konsentrasi belajar");
  }

  if (academicScore >= 80) {
    prediction = "High Academic Performance";
    recommendation =
      "Performa akademik sangat kuat. Pertahankan metode belajar aktif dan eksplorasi materi lanjutan secara mandiri.";
  } else if (academicScore < 60) {
    prediction = "Needs Academic Support";
    recommendation =
      "Fokuskan waktu pada mata kuliah berbobot tinggi, kurangi distraksi layar, dan manfaatkan teknik Pomodoro untuk menjaga konsistensi.";
  }

  return {
    academicScore,
    prediction,
    confidence,
    recommendation,
    strengths,
    weaknesses,
    source: "heuristic_fallback",
  };
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json().catch(() => ({}));

    // Validate essential fields
    if (
      assessmentData.study_hours_per_day === undefined ||
      assessmentData.attendance_percentage === undefined
    ) {
      return NextResponse.json(
        { error: "Data asesmen tidak lengkap." },
        { status: 400 }
      );
    }

    // Try FastAPI ML microservice first
    const mlApiUrl = process.env.ML_API_URL || "http://localhost:8000";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      const res = await fetch(`${mlApiUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const prediction = await res.json();
        if (prediction && !prediction.error) {
          return NextResponse.json(prediction);
        }
      }
    } catch {
      console.warn("ML microservice offline or timed out, using intelligent heuristic fallback.");
    }

    // Return resilient heuristic fallback
    const fallbackResult = computeFallbackInsight(assessmentData as AssessmentData);
    return NextResponse.json(fallbackResult);
  } catch (error) {
    console.error("Academic insight API error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan wawasan akademik." },
      { status: 500 }
    );
  }
}
