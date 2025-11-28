import express from "express";
import moment from "moment";
import cron from "node-cron";
import Word from "../models/wordmodel.js";
import Wod from "../models/wodmodel.js";
import { isValidObjectId } from "mongoose";

const router = express.Router();

/**
 * @route GET /api/wod
 * @description Get today's word of the day
 * @returns {Object} The word of the day with details
 */
router.get("/", async (req, res) => {
  try {
    // Use consistent date string format (YYYY-MM-DD)
    const today = moment().format('YYYY-MM-DD');

    // Check if word of the day exists for today
    let wordOfTheDay = await Wod.findOne({ 
      date: today
    }).populate({
      path: 'word',
      select: '-__v',
      populate: {
        path: 'meanings',
        select: '-__v'
      }
    });

    // If no word of the day for today, set one automatically
    if (!wordOfTheDay) {
      console.log('No word of the day set for today, setting one automatically...');
      
      // Get total count of available words
      const count = await Word.countDocuments();
      if (count === 0) {
        return res.status(404).json({ 
          success: false,
          message: "No words available in database",
          data: null
        });
      }

      // Get random word
      const randomIndex = Math.floor(Math.random() * count);
      const randomWord = await Word.findOne().skip(randomIndex);

      if (!randomWord) {
        return res.status(404).json({ 
          success: false,
          message: "No valid word found",
          data: null
        });
      }

      // Create word of the day entry
      try {
        wordOfTheDay = await Wod.create({
          word: randomWord._id,
          date: today
        });

        // Populate the word
        await wordOfTheDay.populate({
          path: 'word',
          select: '-__v',
          populate: {
            path: 'meanings',
            select: '-__v'
          }
        });

        console.log(`Word of the day set automatically: ${randomWord.word}`);
      } catch (createError) {
        // Handle race condition - if another request created it
        if (createError.code === 11000) {
          wordOfTheDay = await Wod.findOne({ 
            date: today
          }).populate({
            path: 'word',
            select: '-__v',
            populate: {
              path: 'meanings',
              select: '-__v'
            }
          });
        } else {
          throw createError;
        }
      }
    }

    if (!wordOfTheDay || !wordOfTheDay.word) {
      return res.status(404).json({ 
        success: false,
        message: "Word of the day not found",
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Word of the day retrieved successfully",
      data: wordOfTheDay.word,
      word: wordOfTheDay.word // Also include 'word' key for compatibility
    });
  } catch (error) {
    console.error("Error fetching word of the day:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/wod/manual
 * @description Manually set word of the day (admin only)
 * @param {string} wordId - The ID of the word to set as WOD
 * @returns {Object} Confirmation message
 */
router.post("/manual", async (req, res) => {
  try {
    const { wordId } = req.body;

    // Validate input
    if (!wordId || !isValidObjectId(wordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid word ID provided"
      });
    }

    // Check if word exists
    const wordExists = await Word.findById(wordId);
    if (!wordExists) {
      return res.status(404).json({
        success: false,
        message: "Word not found"
      });
    }

    // Use consistent date string format (YYYY-MM-DD)
    const today = moment().format('YYYY-MM-DD');

    // Check if WOD already exists for today
    const existingWod = await Wod.findOne({
      date: today
    });

    if (existingWod) {
      return res.status(400).json({
        success: false,
        message: "Word of the day already set for today"
      });
    }

    // Create new WOD entry
    const newWod = await Wod.create({ 
      word: wordId, 
      date: today 
    });

    res.status(201).json({
      success: true,
      message: "Word of the day set successfully",
      data: {
        wodId: newWod._id,
        word: wordExists
      }
    });
  } catch (error) {
    console.error("Error setting word of the day:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set word of the day",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Updates the Word of the Day with a random selection
 */
const updateWordOfTheDay = async () => {
  try {
    // Use consistent date string format (YYYY-MM-DD)
    const today = moment().format('YYYY-MM-DD');

    // Check if today's word is already set
    const existingEntry = await Wod.findOne({ date: today });
    
    if (existingEntry) {
      console.log("Word of the day already set for today");
      return;
    }

    // Get total count of available words
    const count = await Word.countDocuments();
    if (count === 0) {
      console.log("No words available in database");
      return;
    }

    // Get random word
    const randomIndex = Math.floor(Math.random() * count);
    const randomWord = await Word.findOne().skip(randomIndex).select('-__v');

    if (!randomWord) {
      console.log("No valid word found");
      return;
    }

    // Use findOneAndUpdate with upsert to atomically create or skip
    // This prevents race conditions and duplicate key errors
    try {
      const result = await Wod.findOneAndUpdate(
        { date: today },
        {
          $setOnInsert: {
            word: randomWord._id,
            date: today
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      // If we get here without error, check if it was inserted or updated
      if (result) {
        console.log(`Word of the day set: ${randomWord.word || randomWord.term || 'Unknown'}`);
      }
    } catch (upsertError) {
      // Handle duplicate key error gracefully (race condition)
      if (upsertError.code === 11000) {
        console.log("Word of the day already set for today (race condition prevented)");
        return;
      }
      throw upsertError; // Re-throw if it's a different error
    }
  } catch (error) {
    // Handle duplicate key error gracefully (can happen in race conditions)
    if (error.code === 11000) {
      console.log("Word of the day already set for today (duplicate key prevented)");
      return;
    }
    console.error("Error updating word of the day:", error);
    // Add error reporting here (e.g., Sentry, logging service)
  }
};

// Schedule the function to run at midnight (00:00) every day
cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled Word of the Day update...");
  updateWordOfTheDay();
}, {
  scheduled: true,
  timezone: "UTC" // Specify timezone for consistent behavior
});

// Initial update check when server starts
console.log("Checking Word of the Day on startup...");
updateWordOfTheDay();

export default router;