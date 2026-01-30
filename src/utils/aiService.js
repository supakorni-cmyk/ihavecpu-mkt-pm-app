// src/utils/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Get Key
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
    // FIX: Changed from 'gemini-1.5-flash' to 'gemini-pro' (Stable Version)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("❌ AI Request Failed:", error);
    if (error.message?.includes("404")) {
        alert("⚠️ Model Error: The AI model is currently unavailable. Try again later.");
    } else if (error.message?.includes("SAFETY")) {
        alert("⚠️ AI blocked this request due to safety filters.");
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