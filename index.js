import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import './db.js';  

const app = express();
const port = process.env.PORT || 8000; 

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json()); 

// Routes


// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
