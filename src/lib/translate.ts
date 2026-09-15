const ARABIC_REGEX = /[؀-ۿ]/;
const GERMAN_MARKERS = /[äöüÄÖÜß]/;
const GERMAN_STOPWORDS =
  /\b(und|ist|nicht|der|die|das|mit|für|auf|ich|du|wir|sie|von|zu|im|am|ein|eine|einen|wurde|wird|kann|muss|soll|haben|sein|hat|habe|heute|gestern|kunde|arbeit)\b/i;
const LATIN_ONLY = /^[a-zA-Z0-9\s.,!?'"()\-:;/&%€@]+$/;

export type DetectedLanguage = 'ar' | 'en';

export const detectSourceLanguage = (text: string): DetectedLanguage | null => {
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;
  if (ARABIC_REGEX.test(trimmed)) return 'ar';
  if (GERMAN_MARKERS.test(trimmed) || GERMAN_STOPWORDS.test(trimmed)) return null;
  if (LATIN_ONLY.test(trimmed)) return 'en';
  return null;
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

// Google's public web-translate endpoint. Unofficial and undocumented (no API key,
// no billing), used client-side the same way many browser extensions do. Quality is
// much better than free dictionary-style APIs. Can be rate-limited by Google without
// notice, hence the MyMemory fallback below.
const translateViaGoogle = async (text: string, source: DetectedLanguage): Promise<string | null> => {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=de&dt=t&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) return null;

  const data = await res.json();
  const segments = data?.[0] as [string, string][] | undefined;
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const translated = segments.map((seg) => seg[0]).join('');
  if (!translated || translated.trim().toLowerCase() === text.trim().toLowerCase()) return null;
  return translated;
};

const translateViaMyMemory = async (text: string, source: DetectedLanguage): Promise<string | null> => {
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
  const source = detectSourceLanguage(text);
  if (!source) return null;

  try {
    const viaGoogle = await translateViaGoogle(text, source);
    if (viaGoogle) return viaGoogle;
  } catch {
    // fall through to backup provider
  }

  try {
    return await translateViaMyMemory(text, source);
  } catch {
    return null;
  }
};
