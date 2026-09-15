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

export const translateToGerman = async (text: string): Promise<string | null> => {
  const source = detectSourceLanguage(text);
  if (!source) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${source}|de`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
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
  } catch {
    return null;
  }
};
