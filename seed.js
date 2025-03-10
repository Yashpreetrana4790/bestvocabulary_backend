import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import PhrasalVerb from "./models/phrasalVerbsModel.js";
import Question from "./models/questionModel.js";
import Word from "./models/wordmodel.js";
import Expression from "./models/expressionmodel.js";



const seedData = async () => {
  try {
    // Read JSON file
    const filePath = path.join(process.cwd(), "words.json");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    for (const wordData of data) {
      const expressions = await Promise.all(
        (wordData.expressions || []).map(async (expressionText) => {
          let existingExpression = await Expression.findOne({ expression: expressionText });
          if (!existingExpression) {
            existingExpression = await Expression.create({ expression: expressionText, type: "Phrase" });
          }
          return existingExpression._id;
        })
      );

      const phrasalVerbs = await Promise.all(
        (wordData.PhrasalVerbs || []).map(async (phrasalVerbText) => {
          let existingPhrasalVerb = await PhrasalVerb.findOne({ phrase: phrasalVerbText });
          if (!existingPhrasalVerb) {
            existingPhrasalVerb = await PhrasalVerb.create({ phrase: phrasalVerbText, meaning: "TBD" });
          }
          return existingPhrasalVerb._id;
        })
      );

      const questions = await Promise.all(
        (wordData.questions || []).map(async (questionText) => {
          let existingQuestion = await Question.findOne({ description: questionText });
          if (!existingQuestion) {
            existingQuestion = await Question.create({ description: questionText, type: "multiple-choice", difficulty: "Medium", answer: "TBD" });
          }
          return existingQuestion._id;
        })
      );

      // Create word document with references
      await Word.create({
        word: wordData.word,
        pronunciation: wordData.pronunciation,
        frequency: wordData.frequency,
        overall_tone: wordData.overall_tone,
        etymology: wordData.etymology,
        misspellings: wordData.misspellings || [],
        usage_distribution: wordData.usage_distribution,
        word_family: wordData.word_family,
        meanings: wordData.meanings || [],
        expressions,
        PhrasalVerbs: phrasalVerbs,
        questions,
        additional_info: wordData.additional_info,
      });

      console.log(`Seeded: ${wordData.word}`);
    }

    console.log("Seeding complete.");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding data:", error);
    mongoose.connection.close();
  }
};

// Run the seeding function
seedData();
