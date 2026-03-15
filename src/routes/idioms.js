import express from 'express';
import Expression from '../models/expressionmodel.js';

const router = express.Router();

// Get all idioms with pagination
router.get('/allidioms', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query - filter for idiom type expressions
    const query = { type: { $in: ['idiom', 'Idiom', 'expression', 'Expression'] } };
    
    if (search) {
      query.$or = [
        { expression: { $regex: search, $options: 'i' } },
        { 'meanings.meaning': { $regex: search, $options: 'i' } }
      ];
    }

    const [idioms, totalItems] = await Promise.all([
      Expression.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expression.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    // Transform data to match expected format
    const transformedIdioms = idioms.map(idiom => ({
      _id: idiom._id,
      idiom: idiom.expression,
      meaning: idiom.meanings?.[0]?.meaning || '',
      example: idiom.meanings?.[0]?.examples?.[0] || '',
      difficulty: 'Intermediate',
      pronunciation: idiom.pronunciation,
      tags: idiom.tags,
      createdAt: idiom.createdAt
    }));

    res.json({
      success: true,
      data: transformedIdioms,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching idioms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch idioms',
      error: error.message
    });
  }
});

// Get single idiom by ID
router.get('/idiom/:id', async (req, res) => {
  try {
    const idiom = await Expression.findById(req.params.id).lean();
    
    if (!idiom) {
      return res.status(404).json({
        success: false,
        message: 'Idiom not found'
      });
    }

    const transformedIdiom = {
      _id: idiom._id,
      idiom: idiom.expression,
      meaning: idiom.meanings?.[0]?.meaning || '',
      example: idiom.meanings?.[0]?.examples?.[0] || '',
      meanings: idiom.meanings,
      difficulty: 'Intermediate',
      pronunciation: idiom.pronunciation,
      tags: idiom.tags,
      relatedWords: idiom.relatedWords,
      createdAt: idiom.createdAt
    };

    res.json({
      success: true,
      data: transformedIdiom
    });
  } catch (error) {
    console.error('Error fetching idiom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch idiom',
      error: error.message
    });
  }
});

// Create new idiom
router.post('/createidiom', async (req, res) => {
  try {
    const { idiom, meaning, example, pronunciation, tags } = req.body;

    if (!idiom || !meaning) {
      return res.status(400).json({
        success: false,
        message: 'Idiom and meaning are required'
      });
    }

    const newIdiom = new Expression({
      expression: idiom,
      type: 'idiom',
      pronunciation,
      meanings: [{
        meaning,
        examples: example ? [example] : [],
        notes: ''
      }],
      tags: tags || [],
      relatedWords: []
    });

    await newIdiom.save();

    res.status(201).json({
      success: true,
      message: 'Idiom created successfully',
      data: {
        _id: newIdiom._id,
        idiom: newIdiom.expression,
        meaning: newIdiom.meanings[0].meaning,
        example: newIdiom.meanings[0].examples[0] || ''
      }
    });
  } catch (error) {
    console.error('Error creating idiom:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This idiom already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create idiom',
      error: error.message
    });
  }
});

// Update idiom
router.put('/idiom/:id', async (req, res) => {
  try {
    const { idiom, meaning, example, pronunciation, tags } = req.body;

    const updateData = {
      expression: idiom,
      pronunciation,
      tags
    };

    if (meaning) {
      updateData.meanings = [{
        meaning,
        examples: example ? [example] : [],
        notes: ''
      }];
    }

    const updatedIdiom = await Expression.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedIdiom) {
      return res.status(404).json({
        success: false,
        message: 'Idiom not found'
      });
    }

    res.json({
      success: true,
      message: 'Idiom updated successfully',
      data: {
        _id: updatedIdiom._id,
        idiom: updatedIdiom.expression,
        meaning: updatedIdiom.meanings?.[0]?.meaning || '',
        example: updatedIdiom.meanings?.[0]?.examples?.[0] || ''
      }
    });
  } catch (error) {
    console.error('Error updating idiom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update idiom',
      error: error.message
    });
  }
});

// Delete idiom
router.delete('/idiom/:id', async (req, res) => {
  try {
    const deletedIdiom = await Expression.findByIdAndDelete(req.params.id);

    if (!deletedIdiom) {
      return res.status(404).json({
        success: false,
        message: 'Idiom not found'
      });
    }

    res.json({
      success: true,
      message: 'Idiom deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting idiom:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete idiom',
      error: error.message
    });
  }
});

export default router;
