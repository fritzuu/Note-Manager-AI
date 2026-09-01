import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai/test-key
 *
 * Validates a Google Gemini or OpenRouter API Key.
 * Returns latency, status, provider, and diagnostic messages.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const headerKey = request.headers.get("x-custom-api-key");
    const headerProvider = request.headers.get("x-ai-provider");

    const provider = body.provider || headerProvider || "gemini";
    const testKey =
      body.apiKey ||
      headerKey ||
      (provider === "openrouter"
        ? process.env.OPENROUTER_API_KEY
        : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

    if (!testKey || typeof testKey !== "string" || !testKey.trim()) {
      return NextResponse.json(
        {
          valid: false,
          error: `API key untuk provider ${provider === "openrouter" ? "OpenRouter" : "Gemini"} diperlukan.`,
        },
        { status: 400 }
      );
    }

    const cleanKey = testKey.trim();

    // ─────────────────────────────────────────────
    // 1. Test OpenRouter API Key
    // ─────────────────────────────────────────────
    if (provider === "openrouter") {
      const model = body.model || "google/gemini-2.0-flash-001";
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanKey}`,
            "HTTP-Referer": "https://mindflow.ai",
            "X-Title": "MindFlow AI",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        }
      );

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return NextResponse.json({
          valid: true,
          provider: "openrouter",
          model,
          latencyMs,
          message: `Berhasil terhubung ke OpenRouter (${model}) - Latensi: ${latencyMs}ms`,
        });
      }

      const errorBody = await response.json().catch(() => null);
      const errorMsg =
        errorBody?.error?.message || `HTTP ${response.status} dari OpenRouter API`;

      let userFriendlyMessage = errorMsg;
      if (response.status === 401 || errorMsg.toLowerCase().includes("auth") || errorMsg.toLowerCase().includes("key") || errorMsg.toLowerCase().includes("credit")) {
        userFriendlyMessage = "API key OpenRouter tidak valid atau otentikasi gagal. Periksa kembali API key dari openrouter.ai/keys.";
      } else if (response.status === 429) {
        userFriendlyMessage = "Batas kuota/rate limit OpenRouter terlampaui.";
      }

      return NextResponse.json(
        {
          valid: false,
          provider: "openrouter",
          latencyMs,
          error: userFriendlyMessage,
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 2. Test Google Gemini API Key
    // ─────────────────────────────────────────────
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
        provider: "gemini",
        model: "gemini-2.5-flash",
        latencyMs,
        message: `Berhasil terhubung ke Google Gemini (Latensi: ${latencyMs}ms)`,
      });
    }

    const errorBody = await response.json().catch(() => null);
    const errorMsg = errorBody?.error?.message || `HTTP ${response.status} from Google Gemini API`;
    const errorCode = errorBody?.error?.code || response.status;

    let userFriendlyMessage = errorMsg;
    if (errorCode === 400 || errorMsg.includes("API key not valid")) {
      userFriendlyMessage = "API key Google Gemini tidak valid atau tidak dikenali.";
    } else if (errorCode === 429 || errorMsg.includes("Quota exceeded")) {
      userFriendlyMessage = "API key valid, tetapi batas kuota Google AI telah tercapai.";
    } else if (errorCode === 403 || errorMsg.includes("PERMISSION_DENIED")) {
      userFriendlyMessage = "Akses ditolak. Pastikan Gemini API telah diaktifkan di Google AI Studio.";
    }

    return NextResponse.json(
      {
        valid: false,
        provider: "gemini",
        latencyMs,
        errorCode,
        error: userFriendlyMessage,
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    console.error("Test AI Key Error:", error);
    const msg = error instanceof Error ? error.message : "Network error saat memvalidasi API key.";
    return NextResponse.json(
      {
        valid: false,
        latencyMs,
        error: msg,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/test-key
 */
export async function GET() {
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
  return NextResponse.json({
    geminiConfigured: hasGeminiKey,
    openRouterConfigured: hasOpenRouterKey,
    defaultProviders: ["gemini", "openrouter"],
  });
}
