import { readFile, writeFile } from 'fs/promises';

const flatten = async () => {
  try {
    // Read the JSON file
    const data = await readFile('word_list.json', 'utf-8');
    const words = JSON.parse(data);
    const flattenedWords = words.map(({ response }) => ({
      word: response.word,
      pronunciation: response.pronunciation,
      frequency: response.frequency,
      overall_tone: response.overall_tone,
      etymology: response.etymology,
      misspellings: response.misspellings || [],
      usage_distribution: response.usage_distribution || {},
      word_family: response.word_family,
      meanings: response.meanings?.map(meaning => ({
        pos: meaning.pos,
        subtitle: meaning.subtitle,
        pronunciation: meaning.pronunciation,
        common_usage: meaning.common_usage,
        tone: meaning.tone,
        category: meaning.category || "",
        difficulty: meaning.difficulty,
        meaning: meaning.meaning || "",
        mnemonic: meaning.mnemonic || "",
        easyMeaning: meaning.easyMeaning || "",
        kiddefinition: meaning.kiddefinition || "",
        example_sentences: meaning.example_sentences || [],
        synonyms: meaning.synonyms || [],
        antonyms: meaning.antonyms || []
      })) || [],
      expressions: response.expressions?.map(expression => ({
        expression: expression.expression,
        type: expression.type,
        pronunciation: expression.pronunciation,
        meanings: expression.meanings.map(m => ({
          meaning: m.meaning,
          examples: m.examples || [],
          notes: m.notes || ""
        })),
        relatedWords: expression.relatedWords || [],
        tags: expression.tags || []
      })) || [],
      phrasal_verbs: response.phrasal_verbs?.map(verb => ({
        phrase: verb.phrase,
        meaning: verb.meaning,
        example_sentences: verb.example_sentences || [],
        synonyms: verb.synonyms || [],
        antonyms: verb.antonyms || [],
        relatedWords: verb.relatedWords || []
      })) || [],
      questions: response.questions?.map(question => ({
        type: question.type,
        description: question.description,
        answer: question.answer,
        hint: question.hint || "",
        category: question.category || "",
        difficulty: question.difficulty || "",
        options: question.options || []
      })) || [],
      collocations: response.additional_info?.collocations || [],
      historical_usage: response.additional_info?.historical_usage || "",
      root_analysis: response.additional_info?.root_analysis || {}
    }));
    
    // Write the transformed data back to a new file
    await writeFile('final_word_list.json', JSON.stringify(flattenedWords, null, 2), 'utf-8');

    console.log("Flattened JSON has been saved.");
  } catch (error) {
    console.error("Error:", error);
  }
};

flatten();
