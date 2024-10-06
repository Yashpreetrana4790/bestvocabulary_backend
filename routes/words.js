import express from "express";
import Words from "../models/wordmodel.js";
import Idiom from "../models/Idiommodel.js";
import Phrase from "../models/phrasesmodel.js";


const router = express.Router();



router.get('/words', async (req, res) => {
  try {
    const words = await Words.find();
    res.status(200).json(words);
    console.log('Words:', words);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/words', async (req, res) => {
  const { word, idioms, phrases, pronunciation, partOfSpeech, meanings } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    // Check if the word already exists
    const existingWord = await Words.findOne({ word });
    if (existingWord) {
      return res.status(400).json({ error: 'Word already exists in the database' });
    }

    // Create the new word
    const newWord = await Words.create({
      word,
      pronunciation,
      partOfSpeech,
      meanings,
    });

    if (!newWord) {
      return res.status(400).json({ error: 'Failed to create word' });
    }

    // Handle idioms if provided
    let idiomIds = [];

    if (idioms && idioms.length > 0) {
      for (const idiomData of idioms) {
        const updateData = {};
    
        if (idiomData.definition) updateData.definition = idiomData.definition;
        if (idiomData.examples) updateData.examples = idiomData.examples;
        if (idiomData.synonyms) updateData.synonyms = idiomData.synonyms;
        if (idiomData.antonyms) updateData.antonyms = idiomData.antonyms;
    
        const updatedIdiom = await Idiom.findOneAndUpdate(
          { phrase: { $regex: new RegExp(`^${idiomData.phrase}$`, "i") } },  // Case-insensitive match for the phrase
          {
            $setOnInsert: { phrase: idiomData.phrase, ...updateData },  // Insert with the new fields only if idiom doesn't exist
            $addToSet: { words: newWord._id } 
          },
          { upsert: true, new: true }  
        );
        
        idiomIds.push(updatedIdiom._id);  
      }
    }
    


    // Handle phrases if provided
    let phraseIds = [];
    if (phrases && phrases.length > 0) {
      for (const phraseData of phrases) {
        const existingPhrase = await Phrase.findOne({ phrase: phraseData.phrase });

        if (existingPhrase) {
          // Update the phrase if necessary
          existingPhrase.meanings = phraseData.meanings;
          existingPhrase.examples = phraseData.examples;
          existingPhrase.synonyms = phraseData.synonyms;
          existingPhrase.antonyms = phraseData.antonyms;
          await existingPhrase.save();
          phraseIds.push(existingPhrase._id);
        } else {
          // Create a new phrase
          const newPhrase = await Phrase.create({ ...phraseData });
          phraseIds.push(newPhrase._id);
        }
      }
    }

    newWord.idioms = idiomIds;
    newWord.phrases = phraseIds;
    await newWord.save();

    res.status(201).json({ message: 'Word, idioms, and phrases added successfully', word: newWord });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

