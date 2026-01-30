// src/utils/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateAIContent = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Safety settings (optional, keeps responses clean)
    // You can adjust these if needed
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("❌ AI Error:", error);
    return null;
  }
};

// Example specific function for your Task App
export const suggestTaskDescription = async (taskTitle) => {
  const prompt = `
    I am creating a task management card for a marketing team.
    The task title is: "${taskTitle}".
    Please write a short, professional, and actionable description (max 3 sentences) for this task.
    Add 3 bullet points for potential "Requirements" or "Sub-tasks".
  `;
  return await generateAIContent(prompt);
};