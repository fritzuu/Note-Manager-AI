import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai/test-key
 *
 * Validates a Google Gemini API Key by performing a minimal generation test.
 * Returns latency, status, and diagnostic messages.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const headerKey = request.headers.get("x-custom-api-key");
    const testKey = body.apiKey || headerKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!testKey || typeof testKey !== "string" || !testKey.trim()) {
      return NextResponse.json(
        {
          valid: false,
          error: "API key is required. Please provide a valid Gemini API key.",
        },
        { status: 400 }
      );
    }

    const cleanKey = testKey.trim();

    // Call Gemini API with a minimal ping payload
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
        }),
      }
    );

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return NextResponse.json({
        valid: true,
        model: "gemini-2.5-flash",
        latencyMs,
        message: `Successfully connected to Google Gemini (Latency: ${latencyMs}ms)`,
      });
    }

    // Handle Gemini API error responses
    const errorBody = await response.json().catch(() => null);
    const errorMsg = errorBody?.error?.message || `HTTP ${response.status} from Google Gemini API`;
    const errorCode = errorBody?.error?.code || response.status;

    let userFriendlyMessage = errorMsg;
    if (errorCode === 400 || errorMsg.includes("API key not valid")) {
      userFriendlyMessage = "The provided API key is invalid or not recognized by Google AI.";
    } else if (errorCode === 429 || errorMsg.includes("Quota exceeded")) {
      userFriendlyMessage = "API key is valid, but rate limit or quota has been exceeded.";
    } else if (errorCode === 403 || errorMsg.includes("PERMISSION_DENIED")) {
      userFriendlyMessage = "Permission denied. Please ensure the Gemini API is enabled in your Google AI Studio project.";
    }

    return NextResponse.json(
      {
        valid: false,
        latencyMs,
        errorCode,
        error: userFriendlyMessage,
      },
      { status: 400 }
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error("Test Gemini Key Error:", error);
    return NextResponse.json(
      {
        valid: false,
        latencyMs,
        error: error.message || "Network error while validating API key.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/test-key
 *
 * Returns status of whether the backend server has a default system API key configured.
 */
export async function GET() {
  const hasSystemKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return NextResponse.json({
    systemKeyConfigured: hasSystemKey,
    defaultModel: "gemini-2.5-flash",
  });
}
