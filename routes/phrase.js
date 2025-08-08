import express from 'express';
import PhrasalVerb from '../models/phrasalVerbsmodel.js';

const router = express.Router();

// GET /api/v1/phrase?page=1&limit=20
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
        { verb: searchRegex },
        { meaning: searchRegex },
        { example: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Execute queries in parallel for better performance
    const [phrases, totalCount] = await Promise.all([
      PhrasalVerb.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }) // Sort by newest first
        .lean(), // Convert to plain JS objects
      PhrasalVerb.countDocuments(filter)
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Construct standardized response
    res.json({
      success: true,
      data: phrases,
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
        resultsCount: phrases.length
      }
    });

  } catch (error) {
    console.error('Error fetching phrasal verbs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
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

router.delete('/phrase/:id', async (req, res) => {
  try {
    const deletedPhrasalVerb = await PhrasalVerb.findByIdAndDelete(req?.params?.id);
    res.json(deletedPhrasalVerb);
  } catch (error) {
    console.error('Error deleting phrasal verb:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Helper function to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
export default router;