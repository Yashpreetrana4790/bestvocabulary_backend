/**
 * Shared JSON shape instructions for AI word generation.
 * Must stay aligned with `src/models/wordmodel.js` (Word collection).
 *
 * - Mongoose accepts legacy keys: overall_tone, usage_distribution, word_family,
 *   common_usage, example_sentences, kiddefinition, PhrasalVerbs (or use camelCase equivalents).
 * - wordNormalized is set by the server on save; do not include it in AI output.
 * - meanings[].synonyms and meanings[].antonyms are MongoDB ObjectIds in the DB; use [] here
 *   and put lemma strings in synonym_terms / antonym_terms for curation.
 */
export const WORD_JSON_SCHEMA_INSTRUCTIONS = `
Return ONE JSON object only (no markdown fences, no commentary).

=== Top-level fields (required unless noted) ===

- word: (string) The headword; trim; normal title/lowercase as appropriate for a dictionary entry.
- pronunciation: (string) Primary IPA transcription for the headword.
- frequency: (string) EXACTLY one of: "low" | "medium" | "high" (lowercase).
- overall_tone: (string) EXACTLY one of: "formal" | "informal" | "neutral" | "academic" | "technical" | "colloquial" | "literary" (lowercase).
- etymology: (string) Brief origin and development.
- misspellings: (array of strings) Common misspellings; use lowercase strings.
- note: (string, optional) Short editorial note.

- usage_distribution: (object) Spoken vs written share; each 0–100; spoken + written MUST be ≤ 100.
  - spoken: (number)
  - written: (number)

- word_family: (object)
  - base: (string) Root/base form.
  - inflected: (array of strings) e.g. tense/plural forms.
  - derived: (array of strings) Related words from same root.

- relatedWords: (array, optional) Items with optional word (string), relationStrength (number 0–1).

- meanings: (array) One object per distinct sense / part of speech. Each MUST include:
  - pos: (string) e.g. "noun", "verb", "adjective".
  - pronunciation: (string) IPA for this sense (can match headword if same).
  - meaning: (string) Core definition.
  - subtitle: (string, optional)
  - common_usage: (array) Objects ONLY: { "context": string, "example": string } (both required per item).
  - tone: (string, optional) e.g. "neutral", "positive", "negative" (lowercase).
  - category: (string, optional) e.g. "General", "Business", "Medical" — match your app’s category set when possible.
  - difficulty: (string) EXACTLY one of: "Easy" | "Beginner" | "Medium" | "Intermediate" | "Hard" | "Advanced".
  - mnemonic: (string, optional)
  - easyMeaning: (string, optional) Simple, engaging explanation.
  - kiddefinition: (string, optional) Very simple definition for young learners.
  - notes: (string, optional)

  - example_sentences: (array) Each item MUST be an object with required "text" (string).
    Optional keys: "context", "source", "register".
    Example: { "text": "She delivered the news calmly.", "context": "everyday" }

  - synonyms: (array) MUST be [] (empty). DB stores Word ObjectIds, not strings.
  - antonyms: (array) MUST be [] (empty).
  - synonym_terms: (array of strings, optional) Lemmas with similar meaning (for admin linking later).
  - antonym_terms: (array of strings, optional) Lemmas with opposite meaning (for admin linking later).

- expressions: (array) MUST be [] unless your pipeline resolves Expression ObjectIds.
- PhrasalVerbs: (array) MUST be [] unless your pipeline resolves PhrasalVerb ObjectIds.

- collocations: (array) Objects: { "phrase": string (required), "pattern"?: string, "example"?: string, "score"?: number 0–1 }

- historical_usage: (string, optional) Brief historical note.

- root_analysis: (object, optional)
  - root, prefix, suffix, notes: (strings, optional)
  - morphemes: (array) { "part"?, "type"?, "meaning"?, "originLanguage"? }

- etymologyDetails: (object, optional) Rich etymology:
  - description: (string, optional)
  - origins: (array) { "language" (required), "languageCode"?, "originalWord"?, "meaning"?, "period"?, "region"?: { "name"?, "coordinates"?: { "lat", "lng" } } }
  - rootWords, evolution, cognates: arrays of small objects with string fields as appropriate.

- questions: (array) Quiz items for learning. Each object:
  - type: (string) e.g. "multiple-choice", "fill-in-the-blank", "scenario-based"
  - description, answer, hint: (strings)
  - category, difficulty: (strings)
  - options: (array of strings) for multiple-choice
  Note: The Word document in Mongo stores Question ObjectIds in "questions"; if you only save the Word,
  create Question documents in your pipeline first, or use this array for review and clear before insert.

=== Rules ===
- Valid JSON only: double quotes, no trailing commas.
- Do not include wordNormalized, createdAt, updatedAt, or embedding.
`;

/**
 * Generate AI prompt for word generation
 * @param {string} word - Word to generate prompt for
 * @returns {string} Formatted prompt string
 */
export const generatePrompt = (word) => `
You are a lexicographer API. Output JSON that matches our vocabulary database schema.

Target word: "${word}"

Content rules:
- The word must be a valid, commonly used English **single word** (no idioms, phrases, or multi-word expressions as the headword).
- No archaic or ultra-niche jargon unless the user asked for it.
- Definitions should be useful for language learners.

${WORD_JSON_SCHEMA_INSTRUCTIONS}
`;

export default generatePrompt;
