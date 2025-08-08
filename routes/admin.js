import express from 'express';
import Expression from '../models/expressionmodel.js';
import User from '../models/usermodel.js';
import Word from '../models/wordmodel.js';
import PhrasalVerb from '../models/phrasalVerbsmodel.js';
import Question from '../models/questionsmodel.js';

const router = express.Router();

// Example: GET /api/v1/admin/dashboard/stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalWords,
      totalQuestions,
      totalExpressions,
      totalPhrasalVerbs
    ] = await Promise.all([
      User.countDocuments(),
      Word.countDocuments(),
      Question.countDocuments(),
      Expression.countDocuments(),
      PhrasalVerb.countDocuments()
    ]);

    const stats = {
      totalUsers,
      totalWords,
      totalQuestions,
      totalExpressions,
      totalPhrasalVerbs
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error in dashboard stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
