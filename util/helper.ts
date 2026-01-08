import { NextRequest } from "next/server";

export enum SupportedLanguages {
  EN = 'en',
  ES = 'es',
}

/**
 * Get language from request headers following the backend pattern:
 * 1. Check req.headers.lang (first priority)
 * 2. Check req.query.locale (second priority) - extracted from URL search params
 * 3. Check req.headers.locale (third priority)
 * 4. Default to 'en' if none found
 * 
 * This matches the backend implementation in D:\ts-node\driverjobs-be\src\utils\helper.ts
 */
export function getLang(req?: NextRequest): SupportedLanguages {
  try {
    if (!req) {
      return SupportedLanguages.EN;
    }

    // First priority: lang header (case-insensitive)
    const langHeader = req.headers.get('lang') || req.headers.get('Lang') || req.headers.get('LANG');
    if (langHeader && (langHeader.toLowerCase() === 'en' || langHeader.toLowerCase() === 'es')) {
      return langHeader.toLowerCase() as SupportedLanguages;
    }

    // Second priority: locale query parameter (extract from URL if available)
    try {
      const url = new URL(req.url);
      const localeQuery = url.searchParams.get('locale');
      if (localeQuery && (localeQuery.toLowerCase() === 'en' || localeQuery.toLowerCase() === 'es')) {
        return localeQuery.toLowerCase() as SupportedLanguages;
      }
    } catch (urlError) {
      // URL parsing failed, continue to next priority
    }

    // Third priority: locale header (case-insensitive)
    const localeHeader = req.headers.get('locale') || req.headers.get('Locale') || req.headers.get('LOCALE');
    if (localeHeader && (localeHeader.toLowerCase() === 'en' || localeHeader.toLowerCase() === 'es')) {
      return localeHeader.toLowerCase() as SupportedLanguages;
    }

    // Default to English
    return SupportedLanguages.EN;
  } catch (error) {
    return SupportedLanguages.EN;
  }
}

