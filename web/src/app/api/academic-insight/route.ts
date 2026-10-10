import { NextRequest, NextResponse } from "next/server";
import { validateProfile, supportsModel } from "@/lib/learning/profile";
import { makeLearningInsight, parseModelResult, type ModelResult } from "@/lib/learning/engine";

export async function POST(request: NextRequest) {
  try {
    const validation = validateProfile(await request.json().catch(() => null));
    if (!validation.ok) return NextResponse.json({ error: Object.values(validation.errors)[0], fields: validation.errors }, { status: 422 });
    const profile = validation.data;
    let model: ModelResult | null = null;
    let reason = "service_unavailable";
    if (supportsModel(profile)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(`${(process.env.ML_API_URL || "http://localhost:8000").replace(/\/$/, "")}/predict`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile), signal: controller.signal, cache: "no-store",
        });
        if (response.ok) {
          model = parseModelResult(await response.json());
          if (!model) reason = "invalid_model_response";
        }
      } catch { /* Valid profile still gets a clearly identified rule summary. */ }
      finally { clearTimeout(timeout); }
    } else reason = "unsupported_categories";
    return NextResponse.json(makeLearningInsight(profile, model, reason));
  } catch {
    return NextResponse.json({ error: "Hasil belum bisa disusun. Jawaban profilmu tetap bisa disimpan." }, { status: 500 });
  }
}
