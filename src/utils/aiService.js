// src/utils/aiService.js

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ MISSING API KEY: Please add VITE_GEMINI_API_KEY to your .env file");
}

export const generateAIContent = async (prompt) => {
  if (!API_KEY) {
    alert("❌ AI Error: Missing API Key. Check your .env file.");
    return null;
  }

  // We use the REST API directly to avoid SDK version mismatches
  // Using 'gemini-1.5-flash' which is the current standard free model
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Error Handling for the API response
    if (!response.ok) {
        console.error("❌ AI API Error:", data);
        const errorMessage = data.error?.message || "Unknown API Error";
        
        if (errorMessage.includes("404")) {
             alert("⚠️ Model Error: The 'gemini-1.5-flash' model is not available for your key. Please create a new free key at aistudio.google.com");
        } else {
             alert(`⚠️ AI Failed: ${errorMessage}`);
        }
        return null;
    }

    // Extracting the text from the response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;

  } catch (error) {
    console.error("❌ Network Error:", error);
    alert("⚠️ Network Error: Check your internet connection.");
    return null;
  }
};

export const suggestTaskDescription = async (taskTitle) => {
  const prompt = `
    I am creating a task management card for a marketing team.
    The task title is: "${taskTitle}".
    Please write a short, professional, and actionable description (max 3 sentences) for this task.
    Add 3 bullet points for potential "Requirements" or "Sub-tasks".
    Do not use markdown formatting like **bold** or *italics*. Keep it plain text.
  `;
  return await generateAIContent(prompt);
};