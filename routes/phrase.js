import express from 'express';
import PhrasalVerb from '../models/phrasalVerbsmodel.js';

const router = express.Router();

// Helper function to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// GET /api/v1/phrase/allphrases?page=1&limit=20
router.get('/allphrases', async (req, res) => {
  try {
    // Parse pagination parameters with defaults and validation
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';

    // Validate inputs
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Invalid pagination parameters. Page must be ≥1, limit between 1-100'
      });
    }

    // Build search filter
    const filter = {};
    if (searchQuery) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'gi');
      filter.$or = [
        { phrase: searchRegex },
        { meaning: searchRegex },
        { example_sentences: searchRegex } // Search in example_sentences array
      ];
    }

    // Execute queries in parallel for better performance
    const [phrases, totalCount] = await Promise.all([
      PhrasalVerb.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 }) // Sort by newest first (using _id as fallback)
        .lean(), // Convert to plain JS objects
      PhrasalVerb.countDocuments(filter)
    ]);

    // Transform data to match frontend expectations
    const transformedPhrases = phrases.map((phrase) => ({
      ...phrase,
      example: phrase.example_sentences && phrase.example_sentences.length > 0 
        ? phrase.example_sentences[0] 
        : '',
      // Keep difficulty if it exists, otherwise don't include it
      ...(phrase.difficulty && { difficulty: phrase.difficulty })
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Construct standardized response
    res.json({
      success: true,
      data: transformedPhrases,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      search: {
        query: searchQuery,
        resultsCount: transformedPhrases.length
      }
    });

  } catch (error) {
    console.error('Error fetching phrasal verbs:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch phrasal verbs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


router.post('/createphrase', async (req, res) => {
  try {
    const newPhrasalVerb = await PhrasalVerb.create(req.body);
    res.json(newPhrasalVerb);
  } catch (error) {
    console.error('Error creating phrasal verb:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/phrase/:id', async (req, res) => {
  try {
    const phrasalVerb = await PhrasalVerb.findById(req?.params?.id);
    if (!phrasalVerb) {
      return res.status(404).json({
        success: false,
        error: 'Phrasal verb not found'
      });
    }
    res.json(phrasalVerb);
  } catch (error) {
    console.error('Error fetching phrasal verb:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.put('/phrase/:id', async (req, res) => {
  try {
    const { phrase, meaning, difficulty, example_sentences, synonyms, antonyms, relatedWords } = req.body;
    
    // Validate required fields
    if (!phrase || !meaning) {
      return res.status(400).json({
        success: false,
        error: 'Phrase and meaning are required fields'
      });
    }

    const updatedPhrasalVerb = await PhrasalVerb.findByIdAndUpdate(
      req?.params?.id,
      {
        phrase,
        meaning,
        ...(difficulty && { difficulty }),
        ...(example_sentences && { example_sentences }),
        ...(synonyms !== undefined && { synonyms }),
        ...(antonyms !== undefined && { antonyms }),
        ...(relatedWords !== undefined && { relatedWords })
      },
      { new: true, runValidators: true }
    );

    if (!updatedPhrasalVerb) {
      return res.status(404).json({
        success: false,
        error: 'Phrasal verb not found'
      });
    }

    res.json({
      success: true,
      data: updatedPhrasalVerb
    });
  } catch (error) {
    console.error('Error updating phrasal verb:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.delete('/phrase/:id', async (req, res) => {
  try {
    const deletedPhrasalVerb = await PhrasalVerb.findByIdAndDelete(req?.params?.id);
    if (!deletedPhrasalVerb) {
      return res.status(404).json({
        success: false,
        error: 'Phrasal verb not found'
      });
    }
    res.json({
      success: true,
      data: deletedPhrasalVerb
    });
  } catch (error) {
    console.error('Error deleting phrasal verb:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


export default router;