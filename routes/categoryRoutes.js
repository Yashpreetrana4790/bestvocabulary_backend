import express from 'express';
import Category from '../models/categorymodel.js';
import Word from '../models/wordmodel.js';
import upload from '../middleware/upload.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// Helper function to escape regex
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// GET all categories
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, includeWords } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { isActive: true };
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'gi');
      filter = {
        ...filter,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      };
    }

    let query = Category.find(filter);
    
    // Only populate if includeWords is true
    if (includeWords === 'true') {
      query = query.populate({ path: 'words', select: 'word pronunciation' });
    }
    
    const [categories, totalCount] = await Promise.all([
      query
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Category.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: categories,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET single category with words
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate({
        path: 'words',
        select: 'word pronunciation frequency meanings'
      })
      .lean();

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST create category (with optional image upload)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = null;

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
          return res.status(400).json({
            success: false,
            error: 'Image too large',
            message: 'Image size must be less than 5MB. Please compress or choose a smaller image.'
          });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid image format',
            message: `Only ${allowedTypes.join(', ').replace(/image\//g, '').toUpperCase()} images are allowed.`
          });
        }

        // Check if Cloudinary is configured before attempting upload
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          return res.status(500).json({
            success: false,
            error: 'Image upload service not configured',
            message: 'Cloudinary environment variables are not set. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
          });
        }

        // Log upload attempt for debugging (in development)
        if (process.env.NODE_ENV !== 'production') {
          console.log('📤 Attempting to upload image to Cloudinary...');
          console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? `${process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3)}***` : 'MISSING');
          console.log('  File size:', req.file.size, 'bytes');
          console.log('  File type:', req.file.mimetype);
        }

        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'categories',
          `category-${Date.now()}`
        );
        imageUrl = uploadResult.secure_url;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Image uploaded successfully:', imageUrl);
        }
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to upload image';
        let userMessage = 'An error occurred while uploading your image.';
        
        if (uploadError.http_code) {
          if (uploadError.http_code === 400) {
            errorMessage = 'Invalid image file';
            userMessage = 'The image file appears to be corrupted or in an unsupported format.';
          } else if (uploadError.http_code === 401) {
            errorMessage = 'Cloudinary authentication failed';
            userMessage = 'Invalid Cloudinary credentials. Please check your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the .env file. Make sure they are correct and there are no extra spaces or quotes.';
          } else if (uploadError.http_code === 413) {
            errorMessage = 'Image too large';
            userMessage = 'The image file is too large. Please use an image smaller than 10MB.';
          } else {
            errorMessage = `Upload failed (${uploadError.http_code})`;
            userMessage = `Image upload failed with error code ${uploadError.http_code}. Please try again.`;
          }
        } else if (uploadError.message) {
          errorMessage = uploadError.message;
          // Check for specific Cloudinary error messages
          if (uploadError.message.includes('Must supply api_key') || uploadError.message.includes('api_key')) {
            errorMessage = 'Cloudinary API key missing';
            userMessage = 'CLOUDINARY_API_KEY is missing or invalid. Please check your .env file in bestvocabulary_backend folder and make sure CLOUDINARY_API_KEY is set correctly without quotes or spaces.';
          } else if (uploadError.message.includes('Must supply api_secret') || uploadError.message.includes('api_secret')) {
            errorMessage = 'Cloudinary API secret missing';
            userMessage = 'CLOUDINARY_API_SECRET is missing or invalid. Please check your .env file in bestvocabulary_backend folder and make sure CLOUDINARY_API_SECRET is set correctly without quotes or spaces.';
          } else if (uploadError.message.includes('Invalid cloud_name') || uploadError.message.includes('cloud_name')) {
            errorMessage = 'Cloudinary cloud name invalid';
            userMessage = 'CLOUDINARY_CLOUD_NAME is missing or invalid. Please check your .env file in bestvocabulary_backend folder and make sure CLOUDINARY_CLOUD_NAME is set correctly without quotes or spaces.';
          } else if (uploadError.message.includes('Invalid') || uploadError.message.includes('format')) {
            userMessage = 'The image format is not supported. Please use JPEG, PNG, GIF, or WebP.';
          } else if (uploadError.message.includes('size') || uploadError.message.includes('large')) {
            userMessage = 'The image is too large. Please use a smaller image.';
          } else if (uploadError.message.includes('network') || uploadError.message.includes('timeout')) {
            userMessage = 'Network error occurred. Please check your connection and try again.';
          }
        }
        
        return res.status(500).json({
          success: false,
          error: errorMessage,
          message: userMessage,
          details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
        });
      }
    }

    // Create category with image URL
    const categoryData = {
      ...req.body,
      ...(imageUrl && { image: imageUrl })
    };

    const newCategory = await Category.create(categoryData);
    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT update category (with optional image upload)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    let imageUrl = category.image; // Keep existing image by default

    // Handle image deletion/update
    const imageAction = req.body.imageAction; // 'delete', 'update', or undefined (keep existing)

    if (imageAction === 'delete') {
      // Delete existing image from Cloudinary if it exists
      if (category.image && category.image.includes('cloudinary.com')) {
        try {
          await deleteFromCloudinary(category.image);
        } catch (deleteError) {
          console.warn('Error deleting image:', deleteError);
        }
      }
      imageUrl = null;
    } else if (req.file) {
      // Upload new image to Cloudinary if provided
      try {
        // Delete old image from Cloudinary if it exists
        if (category.image && category.image.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(category.image);
          } catch (deleteError) {
            console.warn('Error deleting old image:', deleteError);
            // Continue even if deletion fails
          }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
          return res.status(400).json({
            success: false,
            error: 'Image too large',
            message: 'Image size must be less than 5MB. Please compress or choose a smaller image.'
          });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid image format',
            message: `Only ${allowedTypes.join(', ').replace(/image\//g, '').toUpperCase()} images are allowed.`
          });
        }

        // Check if Cloudinary is configured before attempting upload
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          return res.status(500).json({
            success: false,
            error: 'Image upload service not configured',
            message: 'Cloudinary environment variables are not set. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
          });
        }

        // Upload new image
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'categories',
          `category-${req.params.id}-${Date.now()}`
        );
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to upload image';
        let userMessage = 'An error occurred while uploading your image.';
        
        if (uploadError.http_code) {
          if (uploadError.http_code === 400) {
            errorMessage = 'Invalid image file';
            userMessage = 'The image file appears to be corrupted or in an unsupported format.';
          } else if (uploadError.http_code === 401) {
            errorMessage = 'Cloudinary authentication failed';
            userMessage = 'Invalid Cloudinary credentials. Please check your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the .env file. Make sure they are correct and there are no extra spaces or quotes.';
          } else if (uploadError.http_code === 413) {
            errorMessage = 'Image too large';
            userMessage = 'The image file is too large. Please use an image smaller than 10MB.';
          } else {
            errorMessage = `Upload failed (${uploadError.http_code})`;
            userMessage = `Image upload failed with error code ${uploadError.http_code}. Please try again.`;
          }
        } else if (uploadError.message) {
          errorMessage = uploadError.message;
          // Check for specific Cloudinary error messages
          if (uploadError.message.includes('Must supply api_key') || uploadError.message.includes('api_key')) {
            errorMessage = 'Cloudinary API key missing';
            userMessage = 'CLOUDINARY_API_KEY is missing or invalid. Please check your .env file in bestvocabulary_backend folder and make sure CLOUDINARY_API_KEY is set correctly without quotes or spaces.';
          } else if (uploadError.message.includes('Must supply api_secret') || uploadError.message.includes('api_secret')) {
            errorMessage = 'Cloudinary API secret missing';
            userMessage = 'CLOUDINARY_API_SECRET is missing or invalid. Please check your .env file in bestvocabulary_backend folder and make sure CLOUDINARY_API_SECRET is set correctly without quotes or spaces.';
          } else if (uploadError.message.includes('Invalid cloud_name') || uploadError.message.includes('cloud_name')) {
            errorMessage = 'Cloudinary cloud name invalid';
            userMessage = 'CLOUDINARY_CLOUD_NAME is missing or invalid. Please check your .env file in bestvocabulary_backend folder and make sure CLOUDINARY_CLOUD_NAME is set correctly without quotes or spaces.';
          } else if (uploadError.message.includes('Invalid') || uploadError.message.includes('format')) {
            userMessage = 'The image format is not supported. Please use JPEG, PNG, GIF, or WebP.';
          } else if (uploadError.message.includes('size') || uploadError.message.includes('large')) {
            userMessage = 'The image is too large. Please use a smaller image.';
          } else if (uploadError.message.includes('network') || uploadError.message.includes('timeout')) {
            userMessage = 'Network error occurred. Please check your connection and try again.';
          }
        }
        
        return res.status(500).json({
          success: false,
          error: errorMessage,
          message: userMessage,
          details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
        });
      }
    }

    // Update category with new data and image URL
    const updateData = {
      ...req.body,
      image: imageUrl
    };
    
    // Remove imageAction from update data (not a field in schema)
    delete updateData.imageAction;

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE category (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Delete image from Cloudinary if it exists
    if (category.image && category.image.includes('cloudinary.com')) {
      try {
        await deleteFromCloudinary(category.image);
      } catch (deleteError) {
        console.warn('Error deleting image from Cloudinary:', deleteError);
        // Continue with category deletion even if image deletion fails
      }
    }

    const deleted = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST add word to category
router.post('/:id/words', async (req, res) => {
  try {
    const { wordId } = req.body;
    
    if (!wordId) {
      return res.status(400).json({ success: false, error: 'Word ID is required' });
    }

    // Check if word exists
    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }

    // Check if category exists
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Check if word is already in category
    if (category.words.includes(wordId)) {
      return res.status(409).json({ 
        success: false, 
        error: 'Word is already in this category' 
      });
    }

    // Add word to category
    category.words.push(wordId);
    await category.save();

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error adding word to category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE remove word from category
router.delete('/:id/words/:wordId', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    category.words = category.words.filter(
      wordId => wordId.toString() !== req.params.wordId
    );
    await category.save();

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error removing word from category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET words in a category
router.get('/:id/words', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const wordIds = category.words;
    const [words, totalCount] = await Promise.all([
      Word.find({ _id: { $in: wordIds } })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Word.countDocuments({ _id: { $in: wordIds } })
    ]);

    res.json({
      success: true,
      data: words,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching words in category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

