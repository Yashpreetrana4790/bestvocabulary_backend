// Quick test script to verify Cloudinary credentials
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

console.log('🔍 Testing Cloudinary Configuration...\n');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Environment Variables:');
console.log('  CLOUDINARY_CLOUD_NAME:', cloudName || '❌ NOT SET');
console.log('  CLOUDINARY_API_KEY:', apiKey ? `${apiKey.substring(0, 5)}...` : '❌ NOT SET');
console.log('  CLOUDINARY_API_SECRET:', apiSecret ? 'SET (hidden)' : '❌ NOT SET');
console.log('');

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Missing Cloudinary credentials in .env file!');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Test the configuration with a simple API call
console.log('🧪 Testing Cloudinary connection...');
console.log('');

// Test with ping API call
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('❌ Cloudinary connection failed!');
    console.error('Error:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.log('');
    
    if (error.message.includes('Must supply api_key')) {
      console.error('💡 Solution: Your CLOUDINARY_API_KEY is missing or invalid');
      console.error('   Make sure it\'s set correctly in your .env file');
    } else if (error.message.includes('Must supply api_secret')) {
      console.error('💡 Solution: Your CLOUDINARY_API_SECRET is missing or invalid');
      console.error('   Make sure it\'s set correctly in your .env file');
    } else if (error.message.includes('cloud_name mismatch')) {
      console.error('💡 Solution: Your CLOUDINARY_CLOUD_NAME doesn\'t match your API credentials');
      console.error('');
      console.error('   The cloud name "' + cloudName + '" doesn\'t match your API key/secret.');
      console.error('   To fix this:');
      console.error('   1. Go to https://cloudinary.com/console');
      console.error('   2. Check which cloud your API key belongs to');
      console.error('   3. Update CLOUDINARY_CLOUD_NAME in .env to match that cloud');
      console.error('');
      console.error('   If you have multiple clouds, make sure you\'re using:');
      console.error('   - The correct cloud name (case-sensitive)');
      console.error('   - The API key from that specific cloud');
      console.error('   - The API secret from that specific cloud');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('💡 Solution: Your credentials are incorrect or unauthorized');
      console.error('   Please verify all three values in your Cloudinary dashboard:');
      console.error('   https://cloudinary.com/console');
    } else {
      console.error('💡 General solution:');
      console.error('   1. Verify all credentials in https://cloudinary.com/console');
      console.error('   2. Make sure cloud name, API key, and secret all come from the same cloud');
      console.error('   3. Check for typos or extra spaces in your .env file');
      console.error('   4. Restart your server after updating .env');
    }
    process.exit(1);
  } else {
    console.log('✅ Cloudinary connection successful!');
    console.log('');
    console.log('Account Details:');
    console.log('  Cloud Name:', result.cloud_name);
    console.log('  Account Type:', result.plan || 'Free');
    console.log('');
    console.log('✅ Your Cloudinary credentials are correct!');
    console.log('');
    console.log('Note: Your cloud name is:', result.cloud_name);
    console.log('Make sure your .env file has: CLOUDINARY_CLOUD_NAME=' + result.cloud_name);
  }
});

