const ARABIC_REGEX = /[؀-ۿ]/;

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

interface GoogleTranslateResult {
  translated: string;
  detectedLang: string;
}

// Google's public web-translate endpoint. Unofficial and undocumented (no API key,
// no billing), used client-side the same way many browser extensions do. `sl=auto`
// lets Google detect the source language itself, which is far more reliable than any
// regex heuristic we could write (umlauts/dashes/quotes in otherwise-English text
// used to trip up a hand-rolled detector).
const translateViaGoogle = async (
  text: string,
  source: string
): Promise<GoogleTranslateResult | null> => {
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

const translateViaMyMemory = async (text: string, source: 'ar' | 'en'): Promise<string | null> => {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|de`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) return null;

  const data = await res.json();
  const translated = data?.responseData?.translatedText as string | undefined;
  if (
    !translated ||
    translated.toUpperCase().includes('MYMEMORY') ||
    translated.trim().toLowerCase() === text.trim().toLowerCase()
  ) {
    return null;
  }
  return translated;
};

export const translateToGerman = async (text: string): Promise<string | null> => {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;

  try {
    const result = await translateViaGoogle(trimmed, 'auto');
    if (result) {
      if (result.detectedLang === 'de') return null; // already German
      if (result.translated.trim().toLowerCase() === trimmed.toLowerCase()) return null;
      return result.translated;
    }
  } catch {
    // fall through to backup provider below
  }

  // Google unreachable: fall back to MyMemory, which needs an explicit source
  // language rather than auto-detection. Only handle the case we can detect
  // ourselves reliably (Arabic script); otherwise skip rather than guess wrong.
  if (!ARABIC_REGEX.test(trimmed)) return null;
  try {
    return await translateViaMyMemory(trimmed, 'ar');
  } catch {
    return null;
  }
};
