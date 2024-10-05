import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import userrouter from './routes/user.js';
import 'dotenv/config';
import './db.js';  // Import the db.js file to establish the MongoDB connection

const app = express();
const port = 8000;

app.use(cors());
app.use(bodyParser.json());  // Removed extra parentheses

console.log("Testing");

app.use(cors({
  origin: '*',
}));


app.use("/api/v1/user", userrouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
