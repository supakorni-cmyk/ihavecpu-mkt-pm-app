// src/utils/aiService.js

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateAIContent = async (prompt) => {
  console.log("🔑 CURRENT LOADED KEY:", API_KEY);

  if (!API_KEY) {
  console.error("❌ MISSING API KEY");
  }

  // List of models to try in order (Newest -> Oldest)
  // We use the raw REST API to avoid SDK version issues
  const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro"
  ];

  for (const modelName of MODELS_TO_TRY) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    try {
      console.log(`🤖 AI: Trying model ${modelName}...`);
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      // If successful, return text immediately
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
         console.log(`✅ Success with ${modelName}`);
         return data.candidates[0].content.parts[0].text;
      }

      // If error is NOT a 404 (e.g., Safety or Quota), stop trying and fail
      if (data.error && data.error.code !== 404) {
         console.error(`⚠️ ${modelName} Error:`, data.error.message);
         // Don't keep trying if it's a safety block or quota issue
         if (data.error.message.includes("SAFETY")) throw new Error("Blocked by Safety Filters");
         if (data.error.message.includes("quota")) throw new Error("Quota Exceeded");
      }

    } catch (error) {
       console.warn(`⚠️ Failed with ${modelName}:`, error);
    }
  }

  // If loop finishes without returning
  alert("❌ AI Failed: No available models found for your API Key. Please get a new key from aistudio.google.com");
  return null;
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