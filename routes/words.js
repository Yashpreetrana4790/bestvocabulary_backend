import express from 'express';
import Word from '../models/wordmodel.js';

const router = express.Router();

router.get("/words", async (req, res) => {
  try {
    const { page = 1, limit = 12, search, difficulty, length, startsWith } = req.query;


    const difficultyMapping = {
      Beginner: ["Easy", "Beginner"],    // "Beginner" maps to ["Easy", "Beginner"]
      Intermediate: ["Medium", "Intermediate"], // "Intermediate" maps to ["Medium", "Intermediate"]
      Advanced: ["Hard", "Advanced"],     // "Advanced" maps to ["Hard", "Advanced"]
    };

    let query = {};

    let wordFilters = [];



    if (search) {
      wordFilters.push({ word: { $regex: new RegExp(search, "i") } });
    }


    if (length) {
      if (length === "short") wordFilters.push({ word: { $regex: /^.{1,4}$/ } });
      else if (length === "medium") wordFilters.push({ word: { $regex: /^.{5,8}$/ } });
      else if (length === "long") wordFilters.push({ word: { $regex: /^.{9,}$/ } });
    }

    if (startsWith) {
      wordFilters.push({ word: { $regex: `^${startsWith}`, $options: "i" } });
    }

    if (wordFilters.length > 0) {
      query.$and = wordFilters;
    }


    if (difficulty) {
      const dbDifficulties = difficultyMapping[difficulty];

      if (dbDifficulties) {
        query["meanings.difficulty"] = { $in: dbDifficulties };
      } else {
        console.log("Invalid difficulty level");
      }
    }

    const words = await Word.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = words.length;

    res.json({ words, total });
  } catch (error) {
    console.error("Error fetching words:", error);
    res.status(500).json({ error: "Failed to fetch words" });
  }
});

// Get a single word by word field
router.get('/words/:word', async (req, res) => {
  try {
    console.log(req.params.word, "Received word");

    const word = await Word.findOne({ word: req.params.word.toLowerCase() }).populate({ path: 'synonyms antonyms expressions PhrasalVerbs questions', strictPopulate: false });

    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    res.json(word);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/words/random', async (req, res) => {
  try {
    const ids = await Word.find({}, { _id: 1 }).lean(); // Get all _id values

    if (!ids.length) {
      return res.status(404).json({ message: 'No words found' });
    }

    const randomId = ids[Math.floor(Math.random() * ids.length)]._id; // Pick a random _id

    if (!mongoose.Types.ObjectId.isValid(randomId)) { // Ensure it's a valid ObjectId
      return res.status(400).json({ message: 'Invalid ObjectId' });
    }

    const randomWord = await Word.findById(randomId);

    res.json(randomWord);
  } catch (error) {
    console.error('Error fetching random word:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



// Create a new word
router.post('/words', async (req, res) => {
  try {
    const newWord = await Word.create(req.body);
    res.status(201).json(newWord);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update a word
router.put('/words/:id', async (req, res) => {
  try {
    const updatedWord = await Word.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedWord) return res.status(404).json({ message: 'Word not found' });
    res.json(updatedWord);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.delete('/words/:id', async (req, res) => {
  try {
    const deletedWord = await Word.findByIdAndDelete(req.params.id);
    if (!deletedWord) return res.status(404).json({ message: 'Word not found' });
    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
