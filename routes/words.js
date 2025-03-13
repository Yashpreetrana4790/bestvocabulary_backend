import express from 'express';
import Word from '../models/wordmodel.js';

const router = express.Router();

// Get all words with pagination and filtering
router.get('/words', async (req, res) => {
  try {
    // Convert page and limit to numbers, ensuring they default to valid values
    const page = Math.max(Number(req.query.page) || 1, 1); // Ensure page is at least 1
    const limit = Math.max(Number(req.query.limit) || 10, 1); // Ensure limit is at least 1
    const search = req.query.search || '';
    const category = req.query.category;

    // Construct query object
    const query = {};
    if (search) {
      query.word = { $regex: search, $options: 'i' };
    }
    if (category) {
      query['meanings.category'] = category;
    }

    // Fetch words with pagination
    const words = await Word.find(query)
      .select('-__v')
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Get total count of matching words
    const count = await Word.countDocuments(query);

    // Send response
    res.json({
      total: count,
      page,
      pages: Math.ceil(count / limit),
      words,
    });

  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
