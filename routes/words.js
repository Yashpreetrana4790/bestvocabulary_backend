import express from 'express';
import Word from '../models/wordmodel.js';
import mongoose from 'mongoose';


const router = express.Router();

router.get("/", async (req, res) => {
  console.log('=== WORDS ROUTE HIT ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  console.log('Query:', req.query);
  
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      difficulty, 
      length, 
      startsWith,
      exactLetters,
      minLetters,
      maxLetters,
      onlyAlphabets,
      minMeanings,
      pos, // Part of Speech filter
      sortBy // Sort option
    } = req.query;

    // Normalize difficulty: 
    // - Easy and Beginner are treated as the same
    // - Medium and Intermediate are treated as the same
    // - Hard and Advanced are treated as the same
    const normalizeDifficulty = (diff) => {
      if (!diff) return diff;
      const lower = diff.toLowerCase();
      if (lower === 'easy' || lower === 'beginner') {
        return 'Beginner'; // Standardize on 'Beginner'
      }
      if (lower === 'medium' || lower === 'intermediate') {
        return 'Intermediate'; // Standardize on 'Intermediate'
      }
      if (lower === 'hard' || lower === 'advanced') {
        return 'Advanced'; // Standardize on 'Advanced'
      }
      return diff;
    };

    const difficultyMapping = {
      Beginner: ["Easy", "Beginner", "easy", "beginner"],
      Intermediate: ["Medium", "Intermediate", "medium", "intermediate"],
      Advanced: ["Hard", "Advanced", "hard", "advanced"],
    };

    let query = {};
    let wordFilters = [];

    // Search filter
    if (search) {
      wordFilters.push({ word: { $regex: search, $options: "i" } });
    }

    // Letter count filters - exact takes priority, ignore length category if exact is set
    if (exactLetters) {
      const exactCount = parseInt(exactLetters);
      if (!isNaN(exactCount) && exactCount > 0) {
        // Use $expr with $strLenCP for exact length matching - most reliable
        // This must match EXACTLY the number of characters
        wordFilters.push({ 
          $expr: { 
            $eq: [{ $strLenCP: "$word" }, exactCount] 
          } 
        });
        console.log(`Exact letters filter applied: ${exactCount} characters using $strLenCP`);
      }
    } else {
      // Range filters (min/max) - only apply if exact is not set
      if (minLetters || maxLetters) {
        const min = minLetters ? parseInt(minLetters) : 0;
        const max = maxLetters ? parseInt(maxLetters) : Number.MAX_SAFE_INTEGER;
        
        if (!isNaN(min) && min > 0) {
          if (max === Number.MAX_SAFE_INTEGER) {
            // Only min specified
            wordFilters.push({ 
              $expr: { 
                $gte: [{ $strLenCP: "$word" }, min] 
              } 
            });
          } else if (!isNaN(max)) {
            // Range
            wordFilters.push({ 
              $expr: { 
                $and: [
                  { $gte: [{ $strLenCP: "$word" }, min] },
                  { $lte: [{ $strLenCP: "$word" }, max] }
                ]
              } 
            });
          }
        }
      } else if (length) {
        // Predefined length categories - only apply if exact/min/max not set
        if (length === "short") {
          wordFilters.push({ 
            $expr: { 
              $and: [
                { $gte: [{ $strLenCP: "$word" }, 1] },
                { $lte: [{ $strLenCP: "$word" }, 4] }
              ]
            } 
          });
        } else if (length === "medium") {
          wordFilters.push({ 
            $expr: { 
              $and: [
                { $gte: [{ $strLenCP: "$word" }, 5] },
                { $lte: [{ $strLenCP: "$word" }, 8] }
              ]
            } 
          });
        } else if (length === "long") {
          wordFilters.push({ 
            $expr: { 
              $gte: [{ $strLenCP: "$word" }, 9] 
            } 
          });
        }
      }
    }

    if (startsWith) {
      // Escape special regex characters
      const escaped = startsWith.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      wordFilters.push({ word: { $regex: `^${escaped}`, $options: "i" } });
    }

    // Only alphabets filter (no numbers or special characters)
    if (onlyAlphabets === 'true' || onlyAlphabets === true) {
      wordFilters.push({ word: { $regex: /^[a-zA-Z]+$/ } });
    }

    // Minimum number of meanings filter - add to wordFilters array
    if (minMeanings) {
      const minMeaningsCount = parseInt(minMeanings);
      if (!isNaN(minMeaningsCount) && minMeaningsCount > 0) {
        // Filter words that have at least minMeaningsCount meanings
        // Use $expr to check the size of the meanings array
        wordFilters.push({
          $expr: {
            $gte: [{ $size: { $ifNull: ["$meanings", []] } }, minMeaningsCount]
          }
        });
        console.log(`Min meanings filter applied: ${minMeaningsCount} meanings minimum`);
      }
    }

    // Part of Speech filter
    if (pos) {
      wordFilters.push({
        "meanings.pos": { $regex: new RegExp(`^${pos}$`, 'i') }
      });
    }

    // Combine all filter conditions first
    if (wordFilters.length > 0) {
      query.$and = wordFilters;
    }

    // Handle difficulty filter - combine with existing filters properly
    if (difficulty) {
      const normalizedDifficulty = normalizeDifficulty(difficulty);
      const dbDifficulties = difficultyMapping[normalizedDifficulty];
      if (dbDifficulties) {
        // Use $or with $regex to match all variants (Medium, Intermediate, medium, intermediate, etc.)
        // Escape special regex characters and create case-insensitive patterns
        const difficultyConditions = dbDifficulties.map(d => ({
          "meanings.difficulty": { 
            $regex: `^${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 
            $options: 'i' 
          }
        }));
        
        // If we already have $and from other filters, add difficulty as another condition
        if (query.$and) {
          query.$and.push({ $or: difficultyConditions });
        } else {
          // No other filters, just add difficulty
          query.$or = difficultyConditions;
        }
      }
    }

    // Log query for debugging
    console.log('=== WORDS QUERY DEBUG ===');
    console.log('All query params:', { page, limit, search, difficulty, length, startsWith, exactLetters, minLetters, maxLetters, onlyAlphabets, minMeanings });
    console.log('Number of wordFilters:', wordFilters.length);
    console.log('wordFilters:', JSON.stringify(wordFilters, null, 2));
    if (exactLetters) {
      const exactCount = parseInt(exactLetters);
      console.log('EXACT LETTERS FILTER:');
      console.log('- Raw value:', exactLetters);
      console.log('- Parsed count:', exactCount);
      console.log('- Pattern:', `^.{${exactCount}}$`);
    }
    console.log('Final query:', JSON.stringify(query, null, 2));
    console.log('========================');

    // Convert to numbers and set defaults
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Build sort object based on sortBy parameter
    let sortObject = {};
    let needsPostSort = false;
    
    if (sortBy) {
      switch (sortBy) {
        case 'alphabetical':
          sortObject = { word: 1 };
          break;
        case 'reverse':
          sortObject = { word: -1 };
          break;
        case 'length':
          // Sort by word length ascending - use aggregation or post-sort
          needsPostSort = true;
          break;
        case 'lengthDesc':
          // Sort by word length descending
          needsPostSort = true;
          break;
        case 'recent':
          sortObject = { createdAt: -1 };
          break;
        case 'popular':
          // Sort by frequency or usage (if available)
          sortObject = { frequency: -1, createdAt: -1 };
          break;
        default:
          sortObject = { word: 1 }; // Default alphabetical
      }
    } else {
      sortObject = { word: 1 }; // Default alphabetical
    }

    // Get total count and paginated results
    let wordsQuery = Word.find(query);
    
    // Apply sorting (skip if we need post-sort)
    if (!needsPostSort) {
      wordsQuery = wordsQuery.sort(sortObject);
    } else {
      // For length-based sorting, sort by word first, then post-process
      wordsQuery = wordsQuery.sort({ word: 1 });
    }

    const [words, totalCount] = await Promise.all([
      wordsQuery
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Word.countDocuments(query)
    ]);

    // Post-sort for length-based sorting (MongoDB can't do this with $expr easily)
    if (needsPostSort) {
      words.sort((a, b) => {
        const lenA = a.word.length;
        const lenB = b.word.length;
        return sortBy === 'lengthDesc' ? lenB - lenA : lenA - lenB;
      });
    }

    // If difficulty filter is applied, sort meanings to prioritize matching difficulty
    if (difficulty && words.length > 0) {
      const normalizedDifficulty = normalizeDifficulty(difficulty);
      const dbDifficulties = difficultyMapping[normalizedDifficulty] || [];
      const lowerDbDifficulties = dbDifficulties.map(d => d.toLowerCase());
      
      words.forEach(word => {
        if (word.meanings && Array.isArray(word.meanings)) {
          // Sort meanings: matching difficulty first, then others
          word.meanings.sort((a, b) => {
            // Normalize both meanings' difficulties for comparison
            const aDifficulty = normalizeDifficulty(a.difficulty || '').toLowerCase();
            const bDifficulty = normalizeDifficulty(b.difficulty || '').toLowerCase();
            
            const aMatches = lowerDbDifficulties.includes(aDifficulty);
            const bMatches = lowerDbDifficulties.includes(bDifficulty);
            
            // If both match or both don't match, maintain original order
            if (aMatches === bMatches) return 0;
            // If only a matches, a comes first
            if (aMatches) return -1;
            // If only b matches, b comes first
            return 1;
          });
        }
      });
    }

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      words,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      },
      // Include difficulty context for frontend
      difficultyContext: difficulty || null
    });
  } catch (error) {
    console.error("Error fetching words:", error);
    res.status(500).json({ error: "Failed to fetch words" });
  }
});

// Get random word - MUST be before /:word route to avoid conflicts
router.get('/random', async (req, res) => {
  try {
    const ids = await Word.find({}, { _id: 1 }).lean(); // Get all _id values

    if (!ids.length) {
      return res.status(404).json({ message: 'No words found' });
    }

    const randomId = ids[Math.floor(Math.random() * ids.length)]._id; // Pick a random _id

    if (!mongoose.Types.ObjectId.isValid(randomId)) { // Ensure it's a valid ObjectId
      return res.status(400).json({ message: 'Invalid ObjectId' });
    }

    const randomWord = await Word.findById(randomId);

    res.json(randomWord);
  } catch (error) {
    console.error('Error fetching random word:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get a single word by word field
router.get('/:word', async (req, res) => {
  try {
    // Express automatically decodes URL parameters, but handle edge cases
    let wordParam = req.params.word;
    
    // Try to decode if it looks encoded (contains %)
    try {
      if (wordParam.includes('%')) {
        wordParam = decodeURIComponent(wordParam);
      }
    } catch (e) {
      // If decoding fails, use the original
      console.log('Could not decode word param, using as-is:', wordParam);
    }
    
    console.log('Received word param:', req.params.word);
    console.log('Processing word:', wordParam);

    // Search for the word (case-insensitive)
    // Try multiple variations: exact match, lowercase, capitalized
    const word = await Word.findOne({ 
      $or: [
        { word: wordParam },
        { word: wordParam.toLowerCase() },
        { word: wordParam.toUpperCase() },
        { word: wordParam.charAt(0).toUpperCase() + wordParam.slice(1).toLowerCase() }
      ]
    })
    .populate({ 
      path: 'meanings.synonyms',
      select: 'word pronunciation meanings',
      strictPopulate: false
    })
    .populate({ 
      path: 'meanings.antonyms',
      select: 'word pronunciation meanings',
      strictPopulate: false
    })
    .populate({ 
      path: 'expressions PhrasalVerbs questions', 
      strictPopulate: false 
    })
    .lean();

    if (!word) {
      console.log(`Word "${wordParam}" not found in database`);
      return res.status(404).json({ 
        message: 'Word not found',
        searchedWord: wordParam
      });
    }

    // Check if difficulty filter is provided in query params
    const difficulty = req.query.difficulty;
    if (difficulty && word.meanings && Array.isArray(word.meanings)) {
      // Define normalizeDifficulty function (same as main route)
      const normalizeDifficulty = (diff) => {
        if (!diff) return diff;
        const lower = diff.toLowerCase();
        if (lower === 'medium' || lower === 'intermediate') {
          return 'Intermediate';
        }
        return diff;
      };

      const difficultyMapping = {
        Beginner: ["Easy", "Beginner", "easy", "beginner"],
        Intermediate: ["Medium", "Intermediate", "medium", "intermediate"],
        Advanced: ["Hard", "Advanced", "hard", "advanced"],
      };
      
      const normalizedDifficulty = normalizeDifficulty(difficulty);
      const dbDifficulties = difficultyMapping[normalizedDifficulty] || [];
      const lowerDbDifficulties = dbDifficulties.map(d => d.toLowerCase());
      
      // Sort meanings: matching difficulty first (normalizing both meanings)
      word.meanings.sort((a, b) => {
        const aDifficulty = normalizeDifficulty(a.difficulty || '').toLowerCase();
        const bDifficulty = normalizeDifficulty(b.difficulty || '').toLowerCase();
        
        const aMatches = lowerDbDifficulties.includes(aDifficulty);
        const bMatches = lowerDbDifficulties.includes(bDifficulty);
        
        if (aMatches === bMatches) return 0;
        if (aMatches) return -1;
        return 1;
      });
    }

    console.log('Word found:', word.word);
    res.json(word);
  } catch (error) {
    console.error('Error fetching word:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


router.put('/word/:id', async (req, res) => {
  try {
    const { id: wordId } = req.params;
    const { word, pronunciation, frequency, overall_tone, etymology, misspellings } = req.body;

    const updatedWord = await Word.findByIdAndUpdate(
      wordId,
      {
        word,
        pronunciation,
        frequency,
        overall_tone,
        etymology,
        misspellings
      },
      { new: true }
    );

    if (!updatedWord) {
      return res.status(404).json({ message: "Word not found" });
    }

    res.json({ success: true, data: updatedWord });
  } catch (error) {
    console.error("Error updating word:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Update word meanings (full meaning objects)
router.put('/words/:id/meanings', async (req, res) => {
  try {
    const { id } = req.params;
    const { meanings } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid word ID' });
    }

    // Validate meanings structure
    if (!Array.isArray(meanings)) {
      return res.status(400).json({ message: 'Meanings must be an array' });
    }

    // Validate each meaning
    for (const [index, meaning] of meanings.entries()) {
      if (!meaning.pos || !meaning.pronunciation || !meaning.meaning) {
        return res.status(400).json({
          message: `Meaning at index ${index} is missing required fields (pos, pronunciation, or meaning)`
        });
      }

      // Validate common_usage
      if (meaning.common_usage && Array.isArray(meaning.common_usage)) {
        for (const [usageIndex, usage] of meaning.common_usage.entries()) {
          if (!usage.context || !usage.example) {
            return res.status(400).json({
              message: `Common usage at index ${usageIndex} in meaning ${index} is missing context or example`
            });
          }
        }
      }

      // Validate example_sentences
      if (meaning.example_sentences && Array.isArray(meaning.example_sentences)) {
        for (const [sentenceIndex, sentence] of meaning.example_sentences.entries()) {
          if (typeof sentence !== 'string' || !sentence.trim()) {
            return res.status(400).json({
              message: `Example sentence at index ${sentenceIndex} in meaning ${index} must be a non-empty string`
            });
          }
        }
      }
    }

    // Find the word
    const word = await Word.findById(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Create a map of existing meanings by _id
    const existingMeaningsMap = new Map();
    word.meanings.forEach(m => {
      if (m._id) existingMeaningsMap.set(m._id.toString(), m);
    });

    // Prepare updated meanings with proper ObjectIDs
    const updatedMeanings = meanings.map(meaning => {
      // For existing meanings
      if (meaning._id && existingMeaningsMap.has(meaning._id)) {
        const existing = existingMeaningsMap.get(meaning._id);
        return {
          ...existing.toObject(), // Preserve existing data
          ...meaning,             // Apply updates
          _id: existing._id       // Maintain original ID
        };
      }

      // For new meanings - generate new ObjectID
      return {
        ...meaning,
        _id: new mongoose.Types.ObjectId() // Correctly reference mongoose
      };
    });

    // Update the word
    word.meanings = updatedMeanings;
    const updatedWord = await word.save();

    res.json({
      success: true,
      data: updatedWord,
      message: 'Meanings updated successfully'
    });
  } catch (error) {
    console.error('Error updating word meanings:', error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message || error.toString() // Handle cases where error.message might be undefined
    });
  }
});





// Update synonyms and antonyms for a specific meaning
router.put('/words/:wordId/meanings/:meaningId/relationships', async (req, res) => {
  try {
    const { wordId, meaningId } = req.params;
    const { synonyms = [], antonyms = [] } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(wordId) || !mongoose.Types.ObjectId.isValid(meaningId)) {
      return res.status(400).json({ message: 'Invalid word ID or meaning ID' });
    }

    // Find the word
    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Find the meaning by ID
    const meaningIndex = word.meanings.findIndex(m => m._id.toString() === meaningId);
    if (meaningIndex === -1) {
      return res.status(404).json({ message: 'Meaning not found' });
    }

    // Convert string IDs to ObjectIds
    const synonymIds = synonyms.map(id => 
      mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
    ).filter(id => id !== null);

    const antonymIds = antonyms.map(id => 
      mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
    ).filter(id => id !== null);

    // Update the meaning's synonyms and antonyms
    word.meanings[meaningIndex].synonyms = synonymIds;
    word.meanings[meaningIndex].antonyms = antonymIds;

    // Save the word
    const updatedWord = await word.save();

    res.json({
      success: true,
      message: 'Relationships updated successfully',
      data: updatedWord.meanings[meaningIndex]
    });
  } catch (error) {
    console.error('Error updating relationships:', error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message || error.toString()
    });
  }
});

// Create a new word
router.post('/word', async (req, res) => {
  try {
    const { word, pronunciation, frequency, overall_tone, etymology, misspellings, meanings } = req.body;

    // Validate required fields
    if (!word || !pronunciation) {
      return res.status(400).json({ 
        message: 'Word and pronunciation are required fields' 
      });
    }

    // Check if word already exists
    const existingWord = await Word.findOne({ word: word.toLowerCase() });
    if (existingWord) {
      return res.status(400).json({ 
        message: 'Word already exists' 
      });
    }

    // Create new word document
    const newWord = new Word({
      word: word.toLowerCase(),
      pronunciation,
      frequency: frequency || 'medium',
      overall_tone,
      etymology,
      misspellings: misspellings || [],
      meanings: meanings || []
    });

    const savedWord = await newWord.save();

    res.status(201).json({ 
      success: true, 
      data: savedWord,
      message: 'Word created successfully' 
    });
  } catch (error) {
    console.error("Error creating word:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Word already exists' 
      });
    }

    res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
