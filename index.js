import express from 'express';
import cors from 'cors';
import userrouter from './routes/user.js';
import wordsrouter from './routes/words.js';
import 'dotenv/config';
import './db.js';  

const app = express();
const port = process.env.PORT || 8000; 

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json()); 

// Routes
app.use("/api/v1/user", userrouter);
app.use("/api/v1/admin", wordsrouter);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
