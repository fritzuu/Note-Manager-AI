import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured in environment variables" },
        { status: 500 }
      );
    }

    const prompt = `You are an academic assistant. Please summarize the following note content.
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
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

    const parsedResult = JSON.parse(responseText.trim());
    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate summary" },
      { status: 500 }
    );
  }
}
