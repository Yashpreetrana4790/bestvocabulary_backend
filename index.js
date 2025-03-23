import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import './db.js';
import userrouter from './routes/user.js';
import wordsrouter from './routes/words.js';
import wordOfTheDayRouter from './routes/wordOfTheDay.js';

import './models/expressionmodel.js';
import './models/phrasalVerbsmodel.js';
import './models/questionsmodel.js';
import './models/wordmodel.js';


const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());


app.use("/api/v1/user", userrouter);
app.use("/api/v1/words", wordsrouter)
app.use("/api/v1/word-of-the-day", wordOfTheDayRouter); // New route
// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
