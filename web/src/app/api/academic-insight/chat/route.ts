import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { question, insight, assessment, history = [] } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const customKey = request.headers.get("x-custom-api-key");
    const provider = request.headers.get("x-ai-provider") || body.provider || "gemini";
    const customModel = request.headers.get("x-ai-model") || body.model;

    const apiKey =
      customKey ||
      (provider === "openrouter"
        ? process.env.OPENROUTER_API_KEY
        : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `API key ${provider === "openrouter" ? "OpenRouter" : "Gemini"} belum terkonfigurasi. Silakan atur di Setup AI atau Pengaturan.`,
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You are MindFlow AI Academic Advisor, an expert university academic mentor, learning strategist, and productivity coach.
Your mission is to provide personalized, encouraging, empathetic, and highly actionable guidance to help the student excel academically, optimize their study habits, prevent burnout, and achieve their full potential.

Student Profile Context:
- Academic Score: ${insight?.academicScore ?? "Belum tersedia"}/100
- Prediction Level: ${insight?.prediction ?? "General"}
- Model Confidence: ${insight?.confidence ? Math.round(insight.confidence * (insight.confidence <= 1 ? 100 : 1)) : "N/A"}%
- Recommendation Summary: ${insight?.recommendation ?? "N/A"}
- Key Strengths: ${Array.isArray(insight?.strengths) ? insight.strengths.join(", ") : "N/A"}
- Areas for Growth / Weaknesses: ${Array.isArray(insight?.weaknesses) ? insight.weaknesses.join(", ") : "N/A"}
- Daily Study Hours: ${assessment?.study_hours_per_day ?? "N/A"} jam/hari
- Sleep Hours: ${assessment?.sleep_hours ?? "N/A"} jam/malam
- Attendance Percentage: ${assessment?.attendance_percentage ?? "N/A"}%
- Mental Health Rating: ${assessment?.mental_health_rating ?? "N/A"}/10
- Social Media & Entertainment: ${(assessment?.social_media_hours ?? 0) + (assessment?.netflix_hours ?? 0)} jam/hari
- Exercise Frequency: ${assessment?.exercise_frequency ?? "N/A"}x/minggu
- Has Part-time Job: ${assessment?.part_time_job ? "Ya" : "Tidak"}

CRITICAL COMPLETION & QUALITY INSTRUCTIONS:
1. Always conclude your complete explanation and never stop or truncate mid-sentence.
2. Structure your response with clean Markdown (bold keywords, bullet points, actionable steps).
3. Respond naturally in encouraging, motivating Indonesian (Bahasa Indonesia).
4. Be comprehensive yet crisp so the response flows seamlessly from opening point to final encouraging conclusion.`;

    const userPrompt = `Student Question:
${question}`;

    // ─────────────────────────────────────────────
    // 1. OpenRouter Provider
    // ─────────────────────────────────────────────
    if (provider === "openrouter") {
      const model = customModel || "google/gemini-2.0-flash-001";
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map((h: { role: string; content: string }) => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.content,
        })),
        { role: "user", content: userPrompt },
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://mindflow.ai",
          "X-Title": "MindFlow AI",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter Academic Advisor error:", errText);
        throw new Error(`OpenRouter API returned status ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content;

      if (!responseText) {
        throw new Error("Empty response from OpenRouter API");
      }

      return NextResponse.json({
        answer: responseText.trim(),
        provider: "openrouter",
        model,
      });
    }

    // ─────────────────────────────────────────────
    // 2. Google Gemini Provider
    // ─────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            ...history.slice(-6).map((h: { role: string; content: string }) => ({
              role: h.role === "user" ? "user" : "model",
              parts: [{ text: h.content }],
            })),
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini Academic Advisor error:", err);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    return NextResponse.json({
      answer: text.trim(),
      provider: "gemini",
      model: "gemini-2.5-flash",
    });
  } catch (error) {
    console.error("Academic Advisor API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal menghubungi AI Academic Advisor.",
      },
      { status: 500 }
    );
  }
}
