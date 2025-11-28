import express from 'express';
import HomophoneGroup from '../models/homophonesmodel.js';
import Homonym from '../models/homonymsmodel.js';
import ConfusedWords from '../models/confusedwordsmodel.js';

const router = express.Router();

// Helper function to escape regex
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// ============================================
// HOMOPHONES ROUTES
// ============================================

// GET all homophone groups
router.get('/homophones', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'gi');
      filter = {
        $or: [
          { 'words.word': searchRegex },
          { 'words.meaning': searchRegex },
          { notes: searchRegex }
        ]
      };
    }

    const [homophones, totalCount] = await Promise.all([
      HomophoneGroup.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      HomophoneGroup.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: homophones,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching homophones:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET single homophone group
router.get('/homophones/:id', async (req, res) => {
  try {
    const homophone = await HomophoneGroup.findById(req.params.id);
    if (!homophone) {
      return res.status(404).json({ success: false, error: 'Homophone group not found' });
    }
    res.json({ success: true, data: homophone });
  } catch (error) {
    console.error('Error fetching homophone:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST create homophone group
router.post('/homophones', async (req, res) => {
  try {
    const newHomophone = await HomophoneGroup.create(req.body);
    res.status(201).json({ success: true, data: newHomophone });
  } catch (error) {
    console.error('Error creating homophone:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update homophone group
router.put('/homophones/:id', async (req, res) => {
  try {
    const updated = await HomophoneGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Homophone group not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating homophone:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE homophone group
router.delete('/homophones/:id', async (req, res) => {
  try {
    const deleted = await HomophoneGroup.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Homophone group not found' });
    }
    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Error deleting homophone:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// HOMONYMS ROUTES
// ============================================

// GET all homonyms
router.get('/homonyms', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'gi');
      filter = {
        $or: [
          { word: searchRegex },
          { 'meanings.meaning': searchRegex },
          { etymology: searchRegex }
        ]
      };
    }

    const [homonyms, totalCount] = await Promise.all([
      Homonym.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Homonym.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: homonyms,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching homonyms:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET single homonym
router.get('/homonyms/:id', async (req, res) => {
  try {
    const homonym = await Homonym.findById(req.params.id);
    if (!homonym) {
      return res.status(404).json({ success: false, error: 'Homonym not found' });
    }
    res.json({ success: true, data: homonym });
  } catch (error) {
    console.error('Error fetching homonym:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST create homonym
router.post('/homonyms', async (req, res) => {
  try {
    const newHomonym = await Homonym.create(req.body);
    res.status(201).json({ success: true, data: newHomonym });
  } catch (error) {
    console.error('Error creating homonym:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update homonym
router.put('/homonyms/:id', async (req, res) => {
  try {
    const updated = await Homonym.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Homonym not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating homonym:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE homonym
router.delete('/homonyms/:id', async (req, res) => {
  try {
    const deleted = await Homonym.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Homonym not found' });
    }
    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Error deleting homonym:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// CONFUSED WORDS ROUTES
// ============================================

// GET all confused words
router.get('/confused-words', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'gi');
      filter = {
        $or: [
          { 'word1.word': searchRegex },
          { 'word2.word': searchRegex },
          { 'word1.meaning': searchRegex },
          { 'word2.meaning': searchRegex },
          { explanation: searchRegex }
        ]
      };
    }

    const [confusedWords, totalCount] = await Promise.all([
      ConfusedWords.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      ConfusedWords.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: confusedWords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching confused words:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET single confused words pair
router.get('/confused-words/:id', async (req, res) => {
  try {
    const confusedWord = await ConfusedWords.findById(req.params.id);
    if (!confusedWord) {
      return res.status(404).json({ success: false, error: 'Confused words pair not found' });
    }
    res.json({ success: true, data: confusedWord });
  } catch (error) {
    console.error('Error fetching confused words:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST create confused words
router.post('/confused-words', async (req, res) => {
  try {
    const newConfusedWords = await ConfusedWords.create(req.body);
    res.status(201).json({ success: true, data: newConfusedWords });
  } catch (error) {
    console.error('Error creating confused words:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update confused words
router.put('/confused-words/:id', async (req, res) => {
  try {
    const updated = await ConfusedWords.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Confused words pair not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating confused words:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE confused words
router.delete('/confused-words/:id', async (req, res) => {
  try {
    const deleted = await ConfusedWords.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Confused words pair not found' });
    }
    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Error deleting confused words:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

