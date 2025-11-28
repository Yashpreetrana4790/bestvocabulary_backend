import express from 'express';
import Idiom from '../models/idiomsmodel.js';

const router = express.Router();

// Helper function to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// GET /api/v1/idioms/allidioms?page=1&limit=20
router.get('/allidioms', async (req, res) => {
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
        { idiom: searchRegex },
        { meaning: searchRegex },
        { example_sentences: searchRegex }
      ];
    }

    // Execute queries in parallel for better performance
    const [idioms, totalCount] = await Promise.all([
      Idiom.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 }) // Sort by newest first
        .lean(),
      Idiom.countDocuments(filter)
    ]);

    // Transform data to match frontend expectations
    const transformedIdioms = idioms.map((idiom) => ({
      ...idiom,
      example: idiom.example_sentences && idiom.example_sentences.length > 0 
        ? idiom.example_sentences[0] 
        : '',
      ...(idiom.difficulty && { difficulty: idiom.difficulty })
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Construct standardized response
    res.json({
      success: true,
      data: transformedIdioms,
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
        resultsCount: transformedIdioms.length
      }
    });

  } catch (error) {
    console.error('Error fetching idioms:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch idioms',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST create idiom
router.post('/createidiom', async (req, res) => {
  try {
    const newIdiom = await Idiom.create(req.body);
    res.json({
      success: true,
      data: newIdiom,
      message: 'Idiom created successfully.'
    });
  } catch (error) {
    console.error('Error creating idiom:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Idiom already exists',
        message: `An idiom with this text already exists.`
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET single idiom by ID
router.get('/idiom/:id', async (req, res) => {
  try {
    const idiom = await Idiom.findById(req?.params?.id).lean();
    
    if (!idiom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Idiom not found.' 
      });
    }

    // Populate relatedItems based on their type
    if (idiom.relatedItems && idiom.relatedItems.length > 0) {
      const Word = (await import('../models/wordmodel.js')).default;
      const Expression = (await import('../models/expressionmodel.js')).default;
      const PhrasalVerb = (await import('../models/phrasalVerbsmodel.js')).default;
      const Idiom = (await import('../models/idiomsmodel.js')).default;

      const populatedItems = await Promise.all(
        idiom.relatedItems.map(async (item) => {
          let populatedItem = null;
          
          switch (item.type) {
            case 'word':
              populatedItem = await Word.findById(item.itemId).lean();
              break;
            case 'expression':
              populatedItem = await Expression.findById(item.itemId).lean();
              break;
            case 'phrase':
              populatedItem = await PhrasalVerb.findById(item.itemId).lean();
              break;
            case 'idiom':
              populatedItem = await Idiom.findById(item.itemId).lean();
              break;
          }
          
          return populatedItem ? {
            type: item.type,
            itemId: populatedItem
          } : null;
        })
      );

      idiom.relatedItems = populatedItems.filter(item => item !== null);
    }

    res.json({
      success: true,
      data: idiom
    });
  } catch (error) {
    console.error('Error fetching idiom:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update idiom
router.put('/idiom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedIdiom = await Idiom.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedIdiom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Idiom not found.' 
      });
    }

    res.json({ 
      success: true, 
      data: updatedIdiom, 
      message: 'Idiom updated successfully.' 
    });
  } catch (error) {
    console.error('Error updating idiom:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Idiom already exists',
        message: `An idiom with this text already exists.`
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE idiom
router.delete('/idiom/:id', async (req, res) => {
  try {
    const deletedIdiom = await Idiom.findByIdAndDelete(req?.params?.id);
    
    if (!deletedIdiom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Idiom not found.' 
      });
    }

    res.json({ 
      success: true, 
      data: deletedIdiom,
      message: 'Idiom deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting idiom:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

