"use client";

const STORAGE_KEY = "mindflow_custom_gemini_api_key";

export function getCustomApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setCustomApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Dispatch storage event for other components to react immediately
    window.dispatchEvent(new Event("mindflow-api-key-updated"));
  } catch (e) {
    console.error("Failed to save API key to localStorage:", e);
  }
}

export function removeCustomApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("mindflow-api-key-updated"));
  } catch (e) {
    console.error("Failed to remove API key from localStorage:", e);
  }
}

export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  if (!apiKey.trim()) {
    return { success: false, message: "Please enter an API key first." };
  }

  try {
    const res = await fetch("/api/ai/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.valid) {
      return {
        success: true,
        message: data.message || "API key is valid and connected to Google Gemini!",
        latencyMs: data.latencyMs,
      };
    }

    return {
      success: false,
      message: data?.error || `Error ${res.status}: Failed to authenticate key`,
      latencyMs: data?.latencyMs,
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Network error while connecting to backend" };
  }
}
