import express from 'express';
import Word from '../models/wordmodel.js';

const router = express.Router();

router.get("/words", async (req, res) => {
  try {
    const { page = 1, limit = 12, search, difficulty, length, startsWith } = req.query;

    let query = {};

    let wordFilters = [];

    // Search filter (fuzzy search)
    if (search) {
      wordFilters.push({ word: { $regex: new RegExp(search, "i") } });
    }

    // Word Length filter
    if (length) {
      if (length === "short") wordFilters.push({ word: { $regex: /^.{1,4}$/ } });
      else if (length === "medium") wordFilters.push({ word: { $regex: /^.{5,8}$/ } });
      else if (length === "long") wordFilters.push({ word: { $regex: /^.{9,}$/ } });
    }

    // Starts with letter filter
    if (startsWith) {
      wordFilters.push({ word: { $regex: `^${startsWith}`, $options: "i" } });
    }

    // Combine word-related filters
    if (wordFilters.length > 0) {
      query.$and = wordFilters;
    }

    // Difficulty filter (applies separately)
    if (difficulty) {
      query.difficulty = difficulty;
    }

    const words = await Word.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Word.countDocuments(query);

    res.json({ words, total });
  } catch (error) {
    console.error("Error fetching words:", error);
    res.status(500).json({ error: "Failed to fetch words" });
  }
});



// Get a single word by ID
router.get('/words/:id', async (req, res) => {
  try {
    const word = await Word.findById(req.params.id).populate('synonyms antonyms expressions PhrasalVerbs questions');
    if (!word) return res.status(404).json({ message: 'Word not found' });
    res.json(word);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Get a random word
router.get('/words/random', async (req, res) => {
  try {
    const count = await Word.countDocuments();
    const randomIndex = Math.floor(Math.random() * count);
    const randomWord = await Word.findOne().skip(randomIndex);
    res.json(randomWord);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
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

// Delete a word
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
