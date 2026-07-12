// Offline Japanese reading generation for the card editor.
//
// Uses kuromoji (IPADIC dictionary served from /public/kuromoji-dict) to tokenize Japanese text,
// then derives: a full hiragana `reading`, Hepburn `romaji` (via wanakana), and a per-token
// `breakdown` skeleton (gloss left blank for the author/agent to fill). Entirely client-side and
// offline once the dictionary is cached — nothing is sent anywhere. Lazy-loaded so kuromoji and the
// ~18 MB dictionary are only fetched when the user actually asks for auto-readings.

import type { Token } from "../core";

const DICT_PATH = "/kuromoji-dict";

let tokenizerPromise: Promise<any> | null = null;

/** Build (once) and cache the kuromoji tokenizer. */
function getTokenizer(): Promise<any> {
  if (tokenizerPromise) return tokenizerPromise;
  tokenizerPromise = (async () => {
    const kuromoji = (await import("kuromoji")).default as any;
    return await new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: DICT_PATH }).build((err: unknown, tokenizer: any) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  })();
  return tokenizerPromise;
}

/** Kick off dictionary loading ahead of time (e.g. when the editor opens). Safe to call repeatedly. */
export function warmupFurigana(): void {
  void getTokenizer().catch(() => {
    tokenizerPromise = null; // allow a retry on the next real call
  });
}

/** Katakana → hiragana by codepoint shift (dependency-free, exact for the standard kana block). */
function kataToHira(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

const HAS_KANA_OR_KANJI = /[぀-ヿ㐀-鿿]/;

export interface FuriganaResult {
  reading: string; // full hiragana reading
  romaji: string; // Hepburn
  breakdown: Token[]; // one entry per meaningful token, gloss blank
}

/**
 * Analyze Japanese text into reading + romaji + token breakdown.
 * Throws if the dictionary can't load; callers should surface a friendly message.
 */
export async function analyzeJapanese(text: string): Promise<FuriganaResult> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { reading: "", romaji: "", breakdown: [] };

  const tokenizer = await getTokenizer();
  const { toRomaji } = await import("wanakana");
  const tokens: any[] = tokenizer.tokenize(trimmed);

  const breakdown: Token[] = [];
  let reading = "";
  for (const t of tokens) {
    const surface: string = t.surface_form ?? "";
    // kuromoji gives katakana reading; "*" means unknown — fall back to the surface form.
    const rawReading: string = t.reading && t.reading !== "*" ? t.reading : surface;
    const hira = kataToHira(rawReading);
    reading += hira;
    // Skip pure whitespace tokens in the breakdown; keep punctuation-with-content.
    if (surface.trim()) {
      breakdown.push({
        token: surface,
        ...(HAS_KANA_OR_KANJI.test(surface) ? { reading: hira } : {}),
        gloss: ""
      });
    }
  }

  return { reading, romaji: toRomaji(reading), breakdown };
}
