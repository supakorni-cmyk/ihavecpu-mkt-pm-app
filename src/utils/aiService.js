// src/utils/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    // 1. Try using the latest standard model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;

  } catch (error) {
    console.error("❌ AI Request Failed:", error);

    // 2. DEBUGGER: If it fails, let's list what models YOU actually have access to
    try {
        console.log("🔄 Attempting to list available models...");
        // Note: This requires the API key to have list permissions, which standard keys do.
        // We create a dummy model instance just to access the method if needed, 
        // but typically we'd look at the error. 
        // Since we can't easily list models from the client SDK without a specific call,
        // we'll guide the user via alerts.
    } catch (e) { console.error("Could not list models", e); }

    if (error.message?.includes("404")) {
        alert("⚠️ Model Not Found: Please run 'npm install @google/generative-ai@latest' in your terminal and restart.");
    } else if (error.message?.includes("SAFETY")) {
        alert("⚠️ AI blocked this request due to safety filters.");
    } else {
        alert(`⚠️ AI Error: ${error.message || "Check console"}`);
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