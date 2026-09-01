import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { question, context } = body;

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
          error: `API key ${provider === "openrouter" ? "OpenRouter" : "Gemini"} belum terkonfigurasi. Silakan masukkan API key di Setup AI atau Pengaturan.`,
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert academic AI assistant for MindFlow AI.
Analyze and answer using information found in the provided notes context whenever relevant.
If specific information cannot be found in the notes context, answer using your broad academic knowledge politely and accurately, but mention that it is based on general academic principles.

IMPORTANT QUALITY & COMPLETION RULES:
1. Always complete your entire response thoroughly and never stop mid-sentence or mid-explanation.
2. Provide well-structured answers using clear Markdown formatting (headings, bullet points, code blocks where needed).
3. Be concise yet comprehensive, avoiding unnecessary fluff so that your answer reaches its natural conclusion cleanly.
4. Match the user's language (Indonesian if asked in Indonesian).`;

    const userPrompt = `Notes Context:
"""
${context || "No notes content provided."}
"""

Question:
${question}`;

    // ─────────────────────────────────────────────
    // 1. OpenRouter Provider
    // ─────────────────────────────────────────────
    if (provider === "openrouter") {
      const model = customModel || "google/gemini-2.0-flash-001";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://mindflow.ai",
            "X-Title": "MindFlow AI",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("OpenRouter Chat API error detail:", errText);
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
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // ─────────────────────────────────────────────
    // 2. Google Gemini Provider (with model fallback)
    // ─────────────────────────────────────────────
    const candidateModels = customModel
      ? [customModel]
      : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Gemini API error for model ${model}:`, errText);
          lastError = new Error(`Gemini API status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const responseText = candidate?.content?.parts?.[0]?.text;

        if (!responseText) {
          lastError = new Error("Empty response from Gemini API");
          continue;
        }

        return NextResponse.json({
          answer: responseText.trim(),
          provider: "gemini",
          model,
        });
      } catch (err: unknown) {
        lastError = err as Error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error("Semua model Gemini mengalami kendala.");
  } catch (error: unknown) {
    console.error("AI Assistant API Error:", error);
    const message = (error as Error).message || "Internal Server Error";
    return NextResponse.json(
      { error: message.includes("abort") ? "Permintaan AI timeout (waktu habis). Silakan coba lagi." : message },
      { status: 500 }
    );
  }
}
