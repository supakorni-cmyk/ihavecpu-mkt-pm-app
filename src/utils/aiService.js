// src/utils/aiService.js

// 🔴 1. PASTE YOUR NEW KEY HERE
const API_KEY = "AIzaSyDkCJGkwp5weJZ1uPyv0dYm0yViLRbSpx8"; 

export const generateAIContent = async (prompt) => {
  if (!API_KEY || API_KEY.includes("AIzaSyDkCJGkwp5weJZ1uPyv0dYm0yViLRbSpx8")) {
    alert("❌ Error: Please paste your API Key inside src/utils/aiService.js");
    return null;
  }

  try {
    // ---------------------------------------------------------
    // STEP 1: Find a working model for your Key
    // ---------------------------------------------------------
    let targetModel = "gemini-1.5-flash"; // Default preference

    // We list models to see what is actually allowed
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const listData = await listResponse.json();

    if (listData.error) {
       console.error("❌ Key Error:", listData.error);
       alert(`⚠️ API Key Error: ${listData.error.message}`);
       return null;
    }

    if (listData.models) {
        // Look for 'generateContent' supported models
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));
            
        console.log("✅ Your Available Models:", availableModels);

        // Pick the best one (prefer 1.5-flash, then pro, then anything else)
        if (availableModels.includes("gemini-1.5-flash")) targetModel = "gemini-1.5-flash";
        else if (availableModels.includes("gemini-pro")) targetModel = "gemini-pro";
        else if (availableModels.length > 0) targetModel = availableModels[0];
    }

    console.log(`🤖 Using Model: ${targetModel}`);

    // ---------------------------------------------------------
    // STEP 2: Send the Request
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