import { NextRequest, NextResponse } from "next/server";

function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
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

    const promptInstructions = `You are an academic assistant. Please summarize the following note content thoroughly and completely.
Always return the summary in structured JSON format with EXACTLY the following keys:
1. "keyConcepts": an array of strings representing the key concepts.
2. "importantPoints": an array of strings representing the important points.
3. "summaryText": a concise paragraph summary in academic language.
4. "conclusionText": a short concluding sentence in academic language.
5. "suggestedQuestions": an array of 3 suggested questions that a user might ask about this note.

Note content:
"""
${content}
"""`;

    // ─────────────────────────────────────────────
    // 1. OpenRouter Provider
    // ─────────────────────────────────────────────
    if (provider === "openrouter") {
      const model = customModel || "google/gemini-2.0-flash-001";
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://mindflow.ai",
            "X-Title": "MindFlow AI",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are an academic assistant that outputs strictly valid JSON without any markdown surrounding text or explanation. Always complete the entire JSON object completely.",
              },
              {
                role: "user",
                content: promptInstructions,
              },
            ],
            temperature: 0.2,
            max_tokens: 4096,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter API summarize error detail:", errText);
        throw new Error(`OpenRouter API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error("Empty response from OpenRouter API");
      }

      const cleaned = cleanJsonText(rawText);
      const parsedResult = JSON.parse(cleaned);
      return NextResponse.json(parsedResult);
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
          contents: [{ parts: [{ text: promptInstructions }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error detail:", errText);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const cleaned = cleanJsonText(responseText);
    const parsedResult = JSON.parse(cleaned);
    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat ringkasan AI." },
      { status: 500 }
    );
  }
}
