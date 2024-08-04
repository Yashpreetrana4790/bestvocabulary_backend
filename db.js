import 'dotenv/config';
import mongoose from 'mongoose';

console.log("Starting db.js execution");  // Log at the beginning

const mongoUri = process.env.MONGO_URI;
console.log("Mongo URI: ", mongoUri);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Successfully connected to MongoDB");
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
}); 

console.log("Ending db.js execution");  // Log at the end
