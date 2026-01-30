// src/utils/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Check if Key Exists
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ MISSING API KEY: Please add VITE_GEMINI_API_KEY to your .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const generateAIContent = async (prompt) => {
  if (!API_KEY) {
    alert("❌ AI Error: Missing API Key. Check your .env file.");
    return null;
  }

  try {
    // Use 'gemini-pro' or 'gemini-1.5-flash' (Flash is faster/free-er)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("❌ AI Request Failed:", error);
    // Common error: Safety filters
    if (error.message?.includes("SAFETY")) {
        alert("⚠️ AI blocked this request due to safety filters. Try a different title.");
    } else {
        alert("⚠️ AI Error: Check console for details.");
    }
    return null;
  }
};

export const suggestTaskDescription = async (taskTitle) => {
  const prompt = `
    I am creating a task management card for a marketing team.
    The task title is: "${taskTitle}".
    Please write a short, professional, and actionable description (max 3 sentences) for this task.
    Add 3 bullet points for potential "Requirements" or "Sub-tasks".
    Do not use markdown formatting like **bold**.
  `;
  return await generateAIContent(prompt);
};