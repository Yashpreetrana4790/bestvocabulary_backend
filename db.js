import 'dotenv/config';
import mongoose from 'mongoose';


const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI environment variable is not set!');
  console.error('Please create a .env file with MONGO_URI=your_mongodb_connection_string');
  console.error('You can copy .env.example to .env and update the values');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ Successfully connected to MongoDB");
}).catch((err) => {
  console.error('❌ Error connecting to MongoDB:', err.message);
}); 

console.log("Ending db.js execution");  // Log at the end
