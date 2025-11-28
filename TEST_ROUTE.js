// Quick test script to verify routes are working
// Run with: node TEST_ROUTE.js

import express from 'express';
import wordsrouter from './routes/words.js';

const app = express();
app.use("/api/v1/words", wordsrouter);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Route test successful', routes: ['/', '/random', '/:word'] });
});

app.listen(8001, () => {
  console.log('Test server running on port 8001');
  console.log('Routes registered:');
  console.log('  GET /api/v1/words');
  console.log('  GET /api/v1/words/random');
  console.log('  GET /api/v1/words/:word');
});

