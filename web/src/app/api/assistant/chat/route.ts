import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const customKey = request.headers.get("x-custom-api-key");
    const apiKey = customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please add your API key in Settings or AI Setup." },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an academic assistant.
Only answer using information found in the provided notes context.
If the information is not available in the notes, clearly say: "The answer cannot be found in your notes."
Do not hallucinate.
Do not make assumptions.`;

    const userPrompt = `Notes Context:
"""
${context || "No notes content provided."}
"""

Question:
${question}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          }
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

    return NextResponse.json({ answer: responseText.trim() });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate answer" },
      { status: 500 }
    );
  }
}
