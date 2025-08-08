import express from 'express';
import Question from '../models/questionsmodel.js';

const router = express.Router();

// GET /api/v1/questions/allquestions?page=1&limit=10
router.get('/allquestions', async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page) || 1;
    const limitNum = parseInt(req.query.limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Question.countDocuments();
    const questions = await Question.find()
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      },
      data: questions
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
