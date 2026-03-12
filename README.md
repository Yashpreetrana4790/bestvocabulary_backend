# Best Vocabulary Backend

A comprehensive vocabulary learning backend API built with Node.js, Express, and MongoDB.

## Architecture Overview

This backend follows clean architecture principles with clear separation of concerns:

```
backend/
├── src/
│   ├── config/          # Configuration files (env, database, JWT)
│   ├── controllers/     # Route handlers (thin layer)
│   ├── middlewares/     # Custom middleware (auth, validation, error handling)
│   ├── models/          # Mongoose models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions (logger, responses, errors)
│   └── validators/      # Zod validation schemas
├── index.js             # Application entry point
└── package.json
```

## Features

### Security
- ✅ JWT authentication with secure token management
- ✅ Helmet.js for security headers
- ✅ Rate limiting (general API + strict auth endpoints)
- ✅ MongoDB injection protection (express-mongo-sanitize)
- ✅ CORS configuration
- ✅ Input sanitization

### Code Quality
- ✅ Clean architecture with service layer pattern
- ✅ Standardized error handling with custom error classes
- ✅ Request/response standardization
- ✅ Winston logging system
- ✅ Async handler wrapper (eliminates try-catch repetition)
- ✅ Zod validation for all endpoints

### Database
- ✅ MongoDB with Mongoose ODM
- ✅ Connection retry logic with exponential backoff
- ✅ Graceful shutdown handling
- ✅ Connection pooling

### API Endpoints

**Authentication:**
- `POST /api/v1/user/register` - Register new user
- `POST /api/v1/user/login` - Login user
- `POST /api/v1/user/change-password` - Change password (authenticated)

**Words:**
- `GET /api/v1/words/words` - Get all words (with filters, pagination)
- `GET /api/v1/words/words/:word` - Get single word by text
- `GET /api/v1/words/words/random` - Get random word
- `PUT /api/v1/words/word/:id` - Update word (admin only)
- `PUT /api/v1/words/words/:id/meanings` - Update word meanings (admin only)
- `GET /api/v1/words/search?q=term` - Search words for relations (admin only)
- `POST /api/v1/words/:wordId/meanings/:meaningId/synonyms` - Add synonym (admin only)
- `POST /api/v1/words/:wordId/meanings/:meaningId/antonyms` - Add antonym (admin only)
- `DELETE /api/v1/words/:wordId/meanings/:meaningId/synonyms/:synonymWordId` - Remove synonym (admin only)
- `DELETE /api/v1/words/:wordId/meanings/:meaningId/antonyms/:antonymWordId` - Remove antonym (admin only)

**Word of the Day:**
- `GET /api/v1/word-of-the-day` - Get today's word
- `POST /api/v1/word-of-the-day/manual` - Set word of the day (admin only)
- Auto-update scheduled daily at midnight UTC

**Questions:**
- `GET /api/v1/questions/allquestions` - Get all questions (paginated)

**Phrasal Verbs:**
- `GET /api/v1/phrase/allphrases` - Get all phrasal verbs (paginated, searchable)
- `GET /api/v1/phrase/phrase/:id` - Get single phrasal verb
- `POST /api/v1/phrase/createphrase` - Create phrasal verb (admin only)
- `DELETE /api/v1/phrase/phrase/:id` - Delete phrasal verb (admin only)

**Admin:**
- `GET /api/v1/admin/dashboard/stats` - Get dashboard statistics (admin only)

**AI Word Generation:**
- `POST /api/v1/ai/generate-word` - Generate complete word data (admin only)
- `POST /api/v1/ai/generate-contextual-word` - Generate word with context (admin only)
- `POST /api/v1/ai/generate-batch` - Generate multiple words (admin only)
- `POST /api/v1/ai/validate-word` - Validate word content quality (admin only)

**Health Check:**
- `GET /health` - Server health check

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- Google AI API key (for word generation)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (use `.env.example` as reference):
```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/bestvocabulary
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
JWT_EXPIRE=1h
GEMINI_AI_KEY=your-google-ai-api-key-here
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. Start the server:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT secret key (min 32 chars recommended) | Yes |
| `JWT_EXPIRE` | JWT expiration time | No (default: 1h) |
| `GEMINI_AI_KEY` | Google Generative AI API key | No |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No (default: *) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | No (default: 900000) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No (default: 100) |

## Database Models

### User
- Email, password, fullName
- Role (student/admin)
- savedQuestions array

### Word
- Word text, pronunciation, frequency
- Etymology, overall tone, misspellings
- word_family, usage_distribution
- meanings array (pos, definition, examples, etc.)
- Questions, expressions, phrasal verbs references

### Question
- Type, description, answer
- Hint, category, difficulty
- Options array

### PhrasalVerb
- Phrase, meaning
- Example sentences
- Synonyms, antonyms, related words

### Expression
- Expression, type, pronunciation
- Meanings array
- Related words, tags

### WordOfTheDay
- Word reference, date

## Development

### Project Structure

**Services:** Business logic layer
- `userService.js` - User operations
- `wordService.js` - Word operations
- `questionService.js` - Question operations
- `phraseService.js` - Phrasal verb operations
- `wodService.js` - Word of the day operations
- `adminService.js` - Admin operations
- `aiService.js` - AI integration

**Validators:** Input validation schemas
- `userValidators.js` - User validation schemas
- `wordValidators.js` - Word validation schemas
- `phraseValidators.js` - Phrasal verb validation schemas

**Middleware:** Request processing
- `auth.js` - Authentication & authorization
- `errorHandler.js` - Global error handling
- `rateLimiter.js` - Rate limiting

**Utils:** Helper functions
- `logger.js` - Winston logger
- `apiResponse.js` - Standardized responses
- `ApiError.js` - Custom error classes
- `asyncHandler.js` - Async wrapper
- `helpers.js` - Utility functions
- `prompt.js` - AI prompt generator

## API Response Format

All responses follow a standard format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

**Paginated:*
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message"
}
```

## Security Features

1. **Helmet.js:** Sets various HTTP headers to secure the app
2. **Rate Limiting:**
   - General API: 100 requests per 15 minutes
   - Auth endpoints: 5 requests per 15 minutes
3. **MongoDB Sanitization:** Prevents NoSQL injection
4. **JWT Security:** Secure token generation and validation
5. **CORS:** Configurable allowed origins

## Error Handling

Custom error classes for consistent error handling:
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (422)
- `InternalServerError` (500)

## Logging

Winston logger configured with:
- Console logging for development
- File logging for production (error.log, combined.log)
- Log rotation and retention
- Exception and rejection handlers

## Contributing

This project follows clean architecture principles. When adding features:

1. Create service functions for business logic
2. Create validators for input validation
3. Keep controllers thin (request/response only)
4. Use async handler wrapper
5. Follow standard response format
6. Add proper error handling

## License

ISC

## Notes

- Uses `bcryptjs` for password hashing
- Google Generative AI for word data generation
- Scheduled jobs via `node-cron`
- ESM module system

