import 'dotenv/config';
import mongoose from 'mongoose';


const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Successfully connected to MongoDB");
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
}); 

console.log("Ending db.js execution");  // Log at the end
