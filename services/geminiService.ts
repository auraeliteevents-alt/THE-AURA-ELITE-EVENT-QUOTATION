
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateDescription = async (itemName: string): Promise<string> => {
  if (!API_KEY) {
    return "API key not configured. Please enter a description manually.";
  }
  
  try {
    const prompt = `Generate a professional, concise one-line description for an event planning service item: '${itemName}'. The context is a quotation for 'The Aura Elite Events'. For example, for 'Venue Decoration', a good description would be 'Comprehensive and elegant decoration for the event venue as per the agreed theme.'. Keep it under 15 words.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error generating description:", error);
    return "Failed to generate description. Please try again or enter manually.";
  }
};
