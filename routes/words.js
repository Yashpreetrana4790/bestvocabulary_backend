import express from 'express';
import Word from '../models/wordmodel.js';
import mongoose from 'mongoose';


const router = express.Router();

router.get("/words", async (req, res) => {
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
      onlyAlphabets
    } = req.query;

    const difficultyMapping = {
      Beginner: ["Easy", "Beginner"],
      Intermediate: ["Medium", "Intermediate"],
      Advanced: ["Hard", "Advanced"],
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

    // Combine all filter conditions
    if (wordFilters.length > 0) {
      query.$and = wordFilters;
    }

    if (difficulty) {
      const dbDifficulties = difficultyMapping[difficulty];
      if (dbDifficulties) {
        query["meanings.difficulty"] = { $in: dbDifficulties };
      }
    }

    // Log query for debugging
    console.log('=== WORDS QUERY DEBUG ===');
    console.log('All query params:', { page, limit, search, difficulty, length, startsWith, exactLetters, minLetters, maxLetters, onlyAlphabets });
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

    // Get total count and paginated results
    const [words, totalCount] = await Promise.all([
      Word.find(query)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Word.countDocuments(query)
    ]);

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
      }
    });
  } catch (error) {
    console.error("Error fetching words:", error);
    res.status(500).json({ error: "Failed to fetch words" });
  }
});

// Get a single word by word field
router.get('/words/:word', async (req, res) => {
  try {
    console.log(req.params.word, "Received word");

    const word = await Word.findOne({ word: req.params.word.toLowerCase() }).populate({ path: 'synonyms antonyms expressions PhrasalVerbs questions', strictPopulate: false });

    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    res.json(word);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/words/random', async (req, res) => {
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

export default router;
