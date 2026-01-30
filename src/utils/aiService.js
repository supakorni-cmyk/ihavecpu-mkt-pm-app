// src/utils/aiService.js

// 🔴 TEMPORARY FIX: PASTE YOUR KEY DIRECTLY HERE
const API_KEY = "AIzaSyDkCJGkwp5weJZ1uPyv0dYm0yViLRbSpx8"; 

export const generateAIContent = async (prompt) => {
  // 1. Debugging: Check if key is actually there
  console.log("🔑 USING HARDCODED KEY:", API_KEY ? API_KEY.substring(0, 10) + "..." : "MISSING");

  if (!API_KEY || API_KEY.includes("PASTE_YOUR_NEW_KEY")) {
    alert("❌ Error: You forgot to paste your API Key inside aiService.js");
    return null;
  }

  // 2. Use the most stable model (Gemini 1.5 Flash)
  // We use the raw URL to avoid any library version issues
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("❌ Google API Error:", data);
        alert(`⚠️ AI Failed: ${data.error?.message || "Unknown error"}`);
        return null;
    }

    // Success!
    return data.candidates?.[0]?.content?.parts?.[0]?.text;

  } catch (error) {
    console.error("❌ Network Error:", error);
    alert("⚠️ Network Error. Check console for details.");
    return null;
  }
};

export const suggestTaskDescription = async (taskTitle) => {
  const prompt = `
    Task: "${taskTitle}".
    Write a 2-sentence description and 3 bullet points for requirements.
  `;
  return await generateAIContent(prompt);
};