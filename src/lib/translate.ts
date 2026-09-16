const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

interface TranslateResult {
  translated: string;
  detectedLang: string;
}

// Google's public web-translate endpoint (translate.googleapis.com). Unofficial and
// undocumented (no API key, no billing), used client-side the same way many browser
// extensions do. `sl=auto` lets Google detect the source language itself, which is
// far more reliable than any regex heuristic we could write.
const translateViaGooglePrimary = async (
  text: string,
  source: string
): Promise<TranslateResult | null> => {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=de&dt=t&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) return null;

  const data = await res.json();
  const segments = data?.[0] as [string, string][] | undefined;
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const translated = segments.map((seg) => seg[0]).join('');
  const detectedLang = (data?.[2] as string | undefined) ?? source;
  if (!translated) return null;
  return { translated, detectedLang };
};

// A second, independent Google Translate endpoint on a different domain
// (clients5.google.com, the one Chrome's own "dict-chrome-ex" extension uses). Same
// translation quality as the primary endpoint, but a genuinely separate service, so
// a rate limit or outage on one doesn't take down the other. Its response is always
// structured JSON on success - unlike MyMemory, it can't return a plain-text error
// message through the same field a real translation comes back in, which is exactly
// what previously let an error string get saved as if it were real translated text.
const translateViaGoogleSecondary = async (
  text: string,
  source: string
): Promise<TranslateResult | null> => {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${source}&tl=de&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) return null;

  const data = await res.json();
  let translated: string | undefined;
  let detectedLang: string | undefined;

  if (Array.isArray(data) && Array.isArray(data[0])) {
    translated = data[0][0];
    detectedLang = data[0][1];
  } else if (Array.isArray(data) && typeof data[0] === 'string') {
    translated = data[0];
  }

  if (!translated) return null;
  return { translated, detectedLang: detectedLang ?? source };
};

export const translateToGerman = async (text: string): Promise<string | null> => {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;

  const attempts = [
    () => translateViaGooglePrimary(trimmed, 'auto'),
    () => translateViaGoogleSecondary(trimmed, 'auto'),
    () => translateViaGooglePrimary(trimmed, 'auto'),
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result) {
        if (result.detectedLang === 'de') return null; // already German
        if (result.translated.trim().toLowerCase() === trimmed.toLowerCase()) return null;
        return result.translated;
      }
    } catch {
      // try the next endpoint
    }
    await sleep(500);
  }

  // Both Google endpoints failed: leave the text untouched rather than risk
  // returning anything that isn't a verified real translation.
  return null;
};
