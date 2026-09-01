"use client";

export type AiProvider = "gemini" | "openrouter";

const STORAGE_KEY_PROVIDER = "mindflow_active_ai_provider";
const STORAGE_KEY_GEMINI = "mindflow_custom_gemini_api_key";
const STORAGE_KEY_OPENROUTER = "mindflow_custom_openrouter_api_key";
const STORAGE_KEY_OPENROUTER_MODEL = "mindflow_custom_openrouter_model";

export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

export function getAiProvider(): AiProvider {
  if (typeof window === "undefined") return "gemini";
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROVIDER);
    if (saved === "openrouter" || saved === "gemini") {
      return saved;
    }
    // Fallback: If user has an OpenRouter key but no Gemini key, default to OpenRouter
    const orKey = localStorage.getItem(STORAGE_KEY_OPENROUTER);
    const geminiKey =
      localStorage.getItem(STORAGE_KEY_GEMINI) ||
      localStorage.getItem("mindflow_custom_api_key");
    if (orKey && !geminiKey) return "openrouter";
    return "gemini";
  } catch {
    return "gemini";
  }
}

export function setAiProvider(provider: AiProvider): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
    window.dispatchEvent(new Event("mindflow-api-key-updated"));
  } catch (e) {
    console.error("Failed to save AI provider:", e);
  }
}

export function getCustomApiKey(provider?: AiProvider): string {
  if (typeof window === "undefined") return "";
  const targetProvider = provider || getAiProvider();
  try {
    if (targetProvider === "openrouter") {
      return localStorage.getItem(STORAGE_KEY_OPENROUTER) || "";
    }
    return (
      localStorage.getItem(STORAGE_KEY_GEMINI) ||
      localStorage.getItem("mindflow_custom_api_key") ||
      ""
    );
  } catch {
    return "";
  }
}

export function setCustomApiKey(key: string, provider?: AiProvider): void {
  if (typeof window === "undefined") return;
  const targetProvider = provider || getAiProvider();
  try {
    const cleanKey = key.trim();
    if (targetProvider === "openrouter") {
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY_OPENROUTER, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_OPENROUTER);
      }
    } else {
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI, cleanKey);
        localStorage.setItem("mindflow_custom_api_key", cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI);
        localStorage.removeItem("mindflow_custom_api_key");
      }
    }
    window.dispatchEvent(new Event("mindflow-api-key-updated"));
  } catch (e) {
    console.error("Failed to save API key to localStorage:", e);
  }
}

export function removeCustomApiKey(provider?: AiProvider): void {
  if (typeof window === "undefined") return;
  const targetProvider = provider || getAiProvider();
  try {
    if (targetProvider === "openrouter") {
      localStorage.removeItem(STORAGE_KEY_OPENROUTER);
    } else {
      localStorage.removeItem(STORAGE_KEY_GEMINI);
      localStorage.removeItem("mindflow_custom_api_key");
    }
    window.dispatchEvent(new Event("mindflow-api-key-updated"));
  } catch (e) {
    console.error("Failed to remove API key from localStorage:", e);
  }
}

export function getOpenRouterModel(): string {
  if (typeof window === "undefined") return DEFAULT_OPENROUTER_MODEL;
  try {
    return localStorage.getItem(STORAGE_KEY_OPENROUTER_MODEL) || DEFAULT_OPENROUTER_MODEL;
  } catch {
    return DEFAULT_OPENROUTER_MODEL;
  }
}

export function setOpenRouterModel(model: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_OPENROUTER_MODEL, model.trim() || DEFAULT_OPENROUTER_MODEL);
  } catch (e) {
    console.error("Failed to save OpenRouter model:", e);
  }
}

export async function testAiApiKey(
  apiKey: string,
  provider?: AiProvider,
  model?: string
): Promise<{ success: boolean; message: string; latencyMs?: number; provider?: string }> {
  const targetProvider = provider || getAiProvider();
  if (!apiKey.trim()) {
    return {
      success: false,
      message: `Masukkan API key ${targetProvider === "openrouter" ? "OpenRouter" : "Gemini"} terlebih dahulu.`,
    };
  }

  try {
    const res = await fetch("/api/ai/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        provider: targetProvider,
        model: model || (targetProvider === "openrouter" ? getOpenRouterModel() : undefined),
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.valid) {
      return {
        success: true,
        message: data.message || `API key valid dan terhubung ke ${targetProvider === "openrouter" ? "OpenRouter" : "Gemini"}!`,
        latencyMs: data.latencyMs,
        provider: data.provider,
      };
    }

    return {
      success: false,
      message:
        data?.error ||
        `Error ${res.status}: Gagal memverifikasi API key ${targetProvider === "openrouter" ? "OpenRouter" : "Gemini"}`,
      latencyMs: data?.latencyMs,
      provider: targetProvider,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error saat menghubungkan ke server";
    return { success: false, message: msg, provider: targetProvider };
  }
}

// Backward compatibility alias
export async function testGeminiApiKey(apiKey: string) {
  return testAiApiKey(apiKey, "gemini");
}
