// src/utils/aiService.js

// 1. Read from the secure environment file
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateAIContent = async (prompt) => {
  // Debug: Check if key loaded (prints only first 5 chars for safety)
  console.log("🔑 Loaded Key:", API_KEY ? `${API_KEY.substring(0, 5)}...` : "MISSING");

  if (!API_KEY) {
    alert("❌ Error: API Key missing. Please add VITE_GEMINI_API_KEY to your .env file and RESTART the server.");
    return null;
  }

  try {
    // ---------------------------------------------------------
    // STEP 1: Dynamic Model Discovery (Fixes 404 Errors)
    // ---------------------------------------------------------
    let targetModel = "gemini-1.5-flash"; // Default preference

    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const listData = await listResponse.json();

    if (listData.error) {
       console.error("❌ Key Error:", listData.error);
       alert(`⚠️ API Key Error: ${listData.error.message}`);
       return null;
    }

    if (listData.models) {
        // Filter for models that support generating content
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));

        // Smart Selection: Prefer Flash -> Pro -> Any
        if (availableModels.includes("gemini-1.5-flash")) targetModel = "gemini-1.5-flash";
        else if (availableModels.includes("gemini-pro")) targetModel = "gemini-pro";
        else if (availableModels.length > 0) targetModel = availableModels[0];
        
        console.log(`🤖 Auto-selected Model: ${targetModel}`);
    }

    // ---------------------------------------------------------
    // STEP 2: Generate Content
    // ---------------------------------------------------------
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${API_KEY}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("❌ AI Error:", data);
        alert(`⚠️ AI Failed: ${data.error?.message || "Unknown error"}`);
        return null;
    }

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