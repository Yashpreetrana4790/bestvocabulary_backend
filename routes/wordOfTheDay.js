import express from "express";
import moment from "moment";
import cron from "node-cron";
import Word from "../models/wordmodel.js";
import Wod from "../models/wodmodel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");

    let wordOfTheDay = await Wod.findOne({ date: today }).populate("word");

    if (!wordOfTheDay) {
      return res.status(404).json({ message: "Word of the day not set yet." });
    }

    res.json(wordOfTheDay.word);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Function to update the Word of the Day
const updateWordOfTheDay = async () => {
  try {
    const today = moment().format("YYYY-MM-DD");

    // Check if today's word is already set
    const existingEntry = await Wod.findOne({ date: today });
    if (existingEntry) return;

    const count = await Word.countDocuments();
    if (count === 0) return console.log("No words available.");

    const randomIndex = Math.floor(Math.random() * count);
    const randomWord = await Word.findOne().skip(randomIndex);

    if (randomWord) {
      await Wod.create({ word: randomWord._id, date: today });
    }
  } catch (error) {
    console.error("Error updating word of the day:", error);
  }
};

// Schedule the function to run at midnight (00:00) every day
cron.schedule("0 0 * * *", updateWordOfTheDay);

// Run once when the server starts
updateWordOfTheDay();

export default router;
