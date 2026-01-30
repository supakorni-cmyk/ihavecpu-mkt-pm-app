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

export const refineTextTone = async (text, tone = "professional") => {
  const prompt = `
    Rewrite the following text to be more ${tone}, clear, and grammatically correct.
    Keep the meaning exactly the same, but improve the style.
    Text: "${text}"
  `;
  return await generateAIContent(prompt);
};

export const summarizeText = async (longText) => {
  const prompt = `
    Summarize the following text into 3 distinct bullet points.
    Focus on the key decisions made and the current action items.
    Text: "${longText}"
  `;
  return await generateAIContent(prompt);
};

export const translateText = async (text, targetLanguage) => {
  const prompt = `
    Translate the following text into ${targetLanguage}.
    Ensure technical terms are translated accurately for a software/business context.
    Text: "${text}"
  `;
  return await generateAIContent(prompt);
};

export const summarizeSchedule = async (dateStr, tasks) => {
  if (!tasks || tasks.length === 0) return "No tasks scheduled for this date.";

  const taskList = tasks.map(t => `- ${t.title} (${t.startTime || "All Day"})`).join("\n");

  const prompt = `
    I am an executive assistant. 
    Here is the schedule for ${dateStr}:
    ${taskList}

    Please write a 2-3 sentence "Morning Briefing" summarizing the day's focus. 
    Highlight the most critical or time-sensitive item. 
    Keep the tone professional and encouraging.
  `;
  
  return await generateAIContent(prompt);
};

export const analyzeFinancials = async (query, transactions) => {
  if (!transactions || transactions.length === 0) return "No transaction data available to analyze.";

  // 1. Summarize data to save token space (Date, Type, Category, Amount, Brand)
  const dataSummary = transactions.map(t => ({
      d: t.date,
      t: t.type,
      c: t.category,
      b: t.brand || t.company || "Unknown",
      a: t.amount,
      desc: t.description ? t.description.substring(0, 30) : ""
  }));

  const dataString = JSON.stringify(dataSummary);

  const prompt = `
    You are a financial analyst helper.
    Here is the transaction data (JSON):
    ${dataString}

    User Question: "${query}"

    Instructions:
    1. Analyze the JSON data to answer the question.
    2. Format currency as '฿XX,XXX.XX'.
    3. Be concise and helpful. 
    4. If the user asks for "Top X", sort the data and list them.
  `;

  return await generateAIContent(prompt);
};