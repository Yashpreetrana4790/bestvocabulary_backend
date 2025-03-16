import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prompt } from "./prompt.js";  // Importing the prompt file

const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_KEY);

const safeJsonParse = (text) => {
  try {
    if (!text) return null;
    let cleanedText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("❌ JSON Parsing Error:", error.message);
    return null;
  }
};

export const getGoogleChatCompletion = async (word) => {
  try {
    if (!word) {
      console.error("No word provided.");
      return null;
    }

    // Use the prompt function to generate the content
    const userPrompt = prompt(word); // Generate the prompt with the word

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(userPrompt); // Send the user prompt to the model

    const response = await result.response;
    const responseText = await response.text();
    return safeJsonParse(responseText); // Parse the response as JSON
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};



getGoogleChatCompletion();
