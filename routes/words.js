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
  const { word, pronunciation, level, meanings, idioms, phrases } = req.body;

  console.log("word:", word, "pronunciation:", pronunciation, "level:", level, "meanings:", meanings, "idioms:", idioms, "phrases:", phrases);
  if (!word || !meanings) {
    return res.status(400).json({ error: 'Word and meanings are required' });
  }

  try {
    // Check if the word already exists
    const existingWord = await Words.findOne({ word });
    if (existingWord) {
      return res.status(400).json({ error: 'Word already exists in the database' });
    }

    const newWord = await Words.create({
      word,
      pronunciation,
      level,
      meanings,
    });

    if (!newWord) {
      return res.status(400).json({ error: 'Failed to create word' });
    }

    // Initialize arrays for idioms and phrases if they exist
    let idiomIds = [];
    let phraseIds = [];

    // Process idioms if provided
    if (idioms && idioms.length > 0) {
      for (const idiomData of idioms) {
        const updatedIdiom = await Idiom.findOneAndUpdate(
          { idiom: { $regex: new RegExp(`^${idiomData.idiom}$`, "i") } },
          {
            $setOnInsert: { ...idiomData },
            $addToSet: { words: newWord._id }
          },
          { upsert: true, new: true }
        );
        idiomIds.push(updatedIdiom._id);
      }
    }

    // Process phrases if provided
    if (phrases && phrases.length > 0) {
      for (const phraseData of phrases) {
        const updatedPhrase = await Phrase.findOneAndUpdate(
          { phrase: { $regex: new RegExp(`^${phraseData.phrase}$`, "i") } },
          {
            $setOnInsert: { ...phraseData },  // Insert if not found
            $addToSet: { words: newWord._id }  // Link word to phrase
          },
          { upsert: true, new: true }
        );
        phraseIds.push(updatedPhrase._id);
      }
    }

    // Save idioms and phrases to the word
    newWord.idioms = idiomIds;
    newWord.phrases = phraseIds;
    await newWord.save();

    res.json(201).json({
      status: true,
      message: 'Word, idioms, and phrases added successfully',
      word: newWord
    });

  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


export default router;

