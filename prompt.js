export const prompt = (word) => `
    Provide structured JSON for the following word:

    Word: ${word}

    Important Constraints:
    - The word must be a **valid, commonly used English word**.
    - **No archaic, obsolete, or highly specialized words**.
    - **No idioms, phrases, expressions, or compound words**—only single words are allowed.
    - The word should have clear, meaningful definitions that are useful for learners.

    Return a JSON object with the following fields:

    - word: (string) The word being defined.
    - pronunciation: (string) Primary phonetic transcription (IPA format).
    - frequency: (string) One of ["low", "medium", "high"] based on common usage.
    - overall_tone: (string) One of ["formal", "informal", "neutral"] based on usage.
    - etymology: (string) A brief origin and historical development of the word.
    - misspellings: (array) Commonly misspelled versions of the word.
    - usage_distribution: (object) A breakdown of where the word is commonly used:
      - spoken: (number) Percentage usage in spoken communication.
      - written: (number) Percentage usage in written communication.

    - word_family: (object) Categorizing word forms into:
      - base: (string) The root word (e.g., "work").
      - inflected: (array) Variations due to tense or plurality (e.g., ["works", "working", "worked"]).
      - derived: (array) Words sharing the same root but with different meanings (e.g., ["worker", "workplace", "workload"]).

- meanings: (array) A list of all possible meanings in objects, where each object contains **all possible meanings** of the word across different parts of speech (noun, verb, adjective, etc.).  
    Each meaning object contains:
      - pos: (string) Part of speech (e.g., "verb", "noun").
      - subtitle: (string) A short phrase explaining the meaning.
      - pronunciation: (string) Phonetic transcription (IPA format) **specific to this meaning**.
      - common_usage: (array) A list of real-world contexts where the word is used, with each object containing:
        - context: (string) The specific usage or field (e.g., "Medical", "Literary").
        - example: (string) A sentence demonstrating its use in that context.
      - tone: (string) ["neutral", "positive", "negative"].
      - category: (string) The category of the word (e.g., "Action", "Emotion").
      - difficulty: (string) ["Beginner", "Intermediate", "Advanced"].
      - meaning: (string) The core definition of the word.
      - mnemonic: (string) A memory aid that makes it easier to remember the meaning.
      - easyMeaning: (string) A simplified, engaging definition that connects the word to a relatable situation. It should be conversational, easy to grasp, and include examples that make the word memorable—just like Vocabulary.com.
      -kiddefinition : (string)  A super simple definition that a 5-year-old can understand.
      - example_sentences: (array) Examples demonstrating the use case of the word.
      - synonyms: (array) List of words with similar meanings.
      - antonyms: (array) List of words with opposite meanings.


    - questions: (array) A list of engaging, situation-based quiz questions that reinforce learning the word in practical or real-world contexts. Each question should have:
      - type: (string) ["multiple-choice", "fill-in-the-blank", "scenario-based"].
      - description: (string) The question text that includes a real-world situation.
      - answer: (string) Correct answer.
      - hint: (string) A clue to help understand the answer.
      - category: (string) ["Vocabulary", "Idioms", "Situational Vocabulary", "Business English", etc.].
      - difficulty: (string) ["Easy", "Medium", "Hard"].
      - options: (array) List of multiple-choice answer options.

    - additional_info: (object) Extra linguistic details, including:
      - collocations: (array) Commonly used word pairings.
      - historical_usage: (string) A brief note on how the word was used in historical texts.
      - root_analysis: (object) The root of the word, including origin language and meaning.

    Ensure the response is in valid JSON format.
`;
