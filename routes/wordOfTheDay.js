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
    const today = moment().startOf('day').toISOString(); // More precise date handling

    const wordOfTheDay = await Wod.findOne({ 
      date: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    }).populate({
      path: 'word',
      select: '-__v' // Exclude version key
    });

    if (!wordOfTheDay) {
      return res.status(404).json({ 
        success: false,
        message: "Today's word of the day has not been set yet.",
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Word of the day retrieved successfully",
      data: wordOfTheDay.word
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

    const today = moment().startOf('day').toISOString();

    // Check if WOD already exists for today
    const existingWod = await Wod.findOne({
      date: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
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
    const today = moment().startOf('day').toISOString();

    // Check if today's word is already set
    const existingEntry = await Wod.findOne({
      date: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    });
    
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

    // Create new WOD entry
    await Wod.create({ 
      word: randomWord._id, 
      date: today 
    });

    console.log(`Word of the day updated: ${randomWord.term}`);
  } catch (error) {
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