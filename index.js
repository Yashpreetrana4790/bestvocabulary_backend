import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import './db.js';
import fs from 'fs/promises';
import PhrasalVerb from './models/phrasalVerbsmodel.js';
import Expression from './models/expressionmodel.js';
import Question from './models/questionsmodel.js';
import Word from './models/wordmodel.js';

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

  

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
