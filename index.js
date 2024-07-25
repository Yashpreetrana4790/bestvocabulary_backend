import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import userrouter from './routes/user.js';


const app = express();
const port = 3000;

app.use(cors());
app.use((bodyParser.json()))


app.use("/api/v1/user", userrouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});