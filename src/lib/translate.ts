const ARABIC_REGEX = /[؀-ۿ]/;
const GERMAN_MARKERS = /[äöüÄÖÜß]/;
const GERMAN_STOPWORDS =
  /\b(und|ist|nicht|der|die|das|mit|für|auf|ich|du|wir|sie|von|zu|im|am|ein|eine|einen|wurde|wird|kann|muss|soll|haben|sein|hat|habe|heute|gestern|kunde|arbeit)\b/i;

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

// MyMemory hard-rejects anything over 500 characters with a plain-text error
// ("QUERY LENGTH LIMIT EXCEEDED...") delivered inside responseData.translatedText,
// the exact same field a real translation comes back in. A previous version of this
// function only filtered out responses containing the word "MYMEMORY", which missed
// this and other error strings entirely, letting an error message get treated as a
// valid translation and silently overwrite real user data. Never even attempt the
// call once text is too long, and validate the response defensively on top of that.
const MYMEMORY_MAX_LENGTH = 480;

const looksLikeMyMemoryError = (translated: string, original: string): boolean => {
  const upper = translated.toUpperCase();
  if (translated === upper && translated.length > 15) return true; // all-caps system message
  if (upper.includes('MYMEMORY')) return true;
  if (upper.includes('QUERY LENGTH LIMIT')) return true;
  if (upper.includes('INVALID') && upper.includes('LANGUAGE')) return true;
  if (translated.trim().toLowerCase() === original.trim().toLowerCase()) return true;
  return false;
};

const translateViaMyMemory = async (text: string, source: 'ar' | 'en'): Promise<string | null> => {
  if (text.length > MYMEMORY_MAX_LENGTH) return null;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|de`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) return null;

  const data = await res.json();
  if (data?.responseStatus && data.responseStatus !== 200) return null;

  const translated = data?.responseData?.translatedText as string | undefined;
  if (!translated || looksLikeMyMemoryError(translated, text)) return null;
  return translated;
};

export const translateToGerman = async (text: string): Promise<string | null> => {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;

  // Try Google twice (it's an unofficial endpoint that can have transient blips)
  // before giving up and falling back to MyMemory.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await translateViaGoogle(trimmed, 'auto');
      if (result) {
        if (result.detectedLang === 'de') return null; // already German
        if (result.translated.trim().toLowerCase() === trimmed.toLowerCase()) return null;
        return result.translated;
      }
    } catch {
      // fall through to retry / backup provider below
    }
    if (attempt === 0) await sleep(800);
  }

  // Google unreachable: fall back to MyMemory, which needs an explicit source
  // language rather than auto-detection. Arabic script is unambiguous; for
  // Latin-script text, assume English unless it already looks German (umlauts
  // or common German stopwords) - a conservative guess, but better than no
  // fallback at all when the primary (much more reliable) provider is down.
  let fallbackSource: 'ar' | 'en' | null = null;
  if (ARABIC_REGEX.test(trimmed)) {
    fallbackSource = 'ar';
  } else if (!GERMAN_MARKERS.test(trimmed) && !GERMAN_STOPWORDS.test(trimmed)) {
    fallbackSource = 'en';
  }
  if (!fallbackSource) return null;

  try {
    return await translateViaMyMemory(trimmed, fallbackSource);
  } catch {
    return null;
  }
};
