import Word from "./models/wordmodel";

// Function to check for existing records and return ObjectId
const getOrCreate = async (Model, query, data) => {
  try {
    const existingDoc = await Model.findOne(query).lean();
    if (existingDoc) return existingDoc._id;

    const newDoc = await Model.create(data);
    return newDoc._id;
  } catch (error) {
    console.error(`❌ Error in getOrCreate for ${Model.modelName}:`, error);
    return null;
  }
};

// Function to fetch word IDs
const getWordIds = async (wordsList) => {
  try {
    if (!wordsList || wordsList.length === 0) {
      return []; // Return early to prevent an invalid MongoDB query
    }

    const wordDocs = await Word.find({
      $or: wordsList.map(word => ({ word: { $regex: `^${word}$`, $options: "i" } }))
    }).select('_id').lean();

    return wordDocs.map(w => w._id);
  } catch (error) {
    console.error('❌ Error fetching word IDs:', error);
    return [];
  }
};




// Function to process word list
const processWordList = async () => {
  try {
    const data = await fs.readFile('final_word_list.json', 'utf-8');
    const words = JSON.parse(data);

    for (const wordData of words) {
      console.log(`🔍 Processing word: ${wordData.word}`);

      // Check if word exists
      const existingWord = await Word.findOne({ word: wordData.word }).lean();
      if (existingWord) {
        console.log(`⚠️ Word "${wordData.word}" already exists. Skipping...`);
        continue;
      }

      // Convert `questions` into ObjectIds
      const questionIds = await Promise.all(
        (wordData.questions ?? []).map(async (question) =>
          getOrCreate(Question, { description: question.description }, question)
        )
      );

      // Convert `phrasal_verbs` into ObjectIds
      const phrasalVerbIds = await Promise.all(
        (wordData.phrasalVerbs ?? []).map(async (phrasalVerb) => {
          try {
            // Check if the phrasal verb already exists
            const existingVerb = await PhrasalVerb.findOne({ phrase: phrasalVerb.phrase });

            if (existingVerb) {
              console.log(`🔹 Skipping duplicate: ${phrasalVerb.phrase}`);
              return existingVerb._id; // Return existing ID
            }

            // If not found, insert new

          } catch (error) {
            console.error("❌ Error processing phrasal verb:", phrasalVerb.phrase, error);
            return null; // Handle errors gracefully
          }
        })
      );


      // Convert `expressions` into ObjectIds
      const expressionIds = await Promise.all(
        (wordData.expressions ?? []).map(async (expression) => {
          try {
            // Try inserting a new document
            const expr = await Expression.create(expression);
            return expr._id; // Return the new ObjectId if inserted
          } catch (error) {
            if (error.code === 11000) {
              // Duplicate key error, find the existing document
              const existingExpr = await Expression.findOne({
                expression: expression.expression,
                type: expression.type
              });

              return existingExpr ? existingExpr._id : null; // Return existing ID if found
            }

            console.error("❌ Error processing expression:", expression.text, error);
            return null; // Handle other errors
          }
        })
      );





      // Create word document
      await Word.create({
        word: wordData.word,
        pronunciation: wordData.pronunciation || '',
        frequency: wordData.frequency || '',
        overall_tone: wordData.overall_tone || '',
        etymology: wordData.etymology || '',
        misspellings: wordData.misspellings || [],
        usage_distribution: wordData.usage_distribution || {},
        word_family: wordData.word_family || '',
        meanings: await Promise.all(
          (wordData.meanings ?? []).map(async (meaning) => ({
            pos: meaning.pos || '',
            subtitle: meaning.subtitle || '',
            pronunciation: meaning.pronunciation || '',
            common_usage: meaning.common_usage ?? [],
            tone: meaning.tone || '',
            category: meaning.category || '',
            difficulty: meaning.difficulty || '',
            meaning: meaning.meaning || '',
            mnemonic: meaning.mnemonic || '',
            easyMeaning: meaning.easyMeaning || '',
            kiddefinition: meaning.kiddefinition || '',
            example_sentences: meaning.example_sentences ?? [],
            synonyms: await getWordIds(meaning.synonyms ?? []),
            antonyms: await getWordIds(meaning.antonyms ?? []),
          }))
        ),
        root_analysis: wordData.root_analysis || {},
        historical_usage: wordData.historical_usage || '',
        collocations: wordData.collocations ?? [],
        questions: questionIds.filter(id => id), // Remove null IDs
        phrasal_verbs: phrasalVerbIds.filter(id => id),
        expressions: expressionIds.filter(id => id),
      });

      console.log(`✅ Saved word: ${wordData.word}`);
    }

    console.log('✅ Word processing completed.');
  } catch (error) {
    console.error('❌ Error processing words:', error);
  }
};

// Run when server starts
processWordList();