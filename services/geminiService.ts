import { Language, ScoredSyndrome, ApiKeyEntry } from '../types';

export const sendMessageToGeminiStream = async (
  message: string,
  image: string | undefined,
  history: any[],
  language: Language,
  isPregnant: boolean,
  cdssAnalysis?: ScoredSyndrome[],
  apiKeys?: ApiKeyEntry[],
  onChunk?: (text: string) => void,
  onKeyExhausted?: (key: string) => void
) => {
  try {
    const res = await fetch('/api/gemini/diagnose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        image,
        history,
        language,
        isPregnant,
        cdssAnalysis,
        apiKeys,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || "Gagal memproses diagnosis dari AI.";
      
      const lowerErr = errMsg.toLowerCase();
      if (onKeyExhausted && apiKeys && apiKeys.length > 0) {
        if (lowerErr.includes("429") || lowerErr.includes("quota") || lowerErr.includes("limit") || lowerErr.includes("403")) {
          const activeKey = apiKeys.find((k) => !k.isExhausted && k.key && k.key.trim() !== "");
          if (activeKey) {
            onKeyExhausted(activeKey.key);
          }
        }
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    const cleanText = data.text;

    if (onChunk) onChunk(cleanText);

    const parsed = JSON.parse(cleanText);
    return { data: parsed };
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    throw error;
  }
};
