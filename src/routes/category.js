import express from 'express';
import Category from '../models/categorymodel.js';

const router = express.Router();

// GET all categories with pagination and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]}
      : {};

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query)
    ]);

    res.json({
      data: categories,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET single category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const includeWords = req.query.includeWords === 'true';

    let query = Category.findById(id);
    if (includeWords) {
      query = query.populate('words');
    }

    const category = await query.lean();
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST create new category
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, image, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = new Category({
      name,
      description,
      color,
      icon,
      image,
      tags: tags || []
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, image, tags, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingCategory) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
      category.name = name;
    }

    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (tags !== undefined) category.tags = tags;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// POST add word to category
router.post('/:id/words', async (req, res) => {
  try {
    const { id } = req.params;
    const { wordId } = req.body;

    if (!wordId) {
      return res.status(400).json({ error: 'Word ID is required' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.words.includes(wordId)) {
      return res.status(400).json({ error: 'Word already in this category' });
    }

    category.words.push(wordId);
    await category.save();

    res.json(category);
  } catch (error) {
    console.error('Error adding word to category:', error);
    res.status(500).json({ error: 'Failed to add word to category' });
  }
});

// DELETE remove word from category
router.delete('/:id/words/:wordId', async (req, res) => {
  try {
    const { id, wordId } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    category.words = category.words.filter(w => w.toString() !== wordId);
    await category.save();

    res.json(category);
  } catch (error) {
    console.error('Error removing word from category:', error);
    res.status(500).json({ error: 'Failed to remove word from category' });
  }
});

// GET words in category
router.get('/:id/words', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const category = await Category.findById(id)
      .populate({
        path: 'words',
        options: {
          skip,
          limit
        }
      })
      .lean();

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const totalWords = await Category.findById(id).select('words').lean();
    const total = totalWords?.words?.length || 0;

    res.json({
      data: category.words,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching words in category:', error);
    res.status(500).json({ error: 'Failed to fetch words in category' });
  }
});

export default router;
