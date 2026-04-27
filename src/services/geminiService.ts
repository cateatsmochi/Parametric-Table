
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { TableConfig, MaterialType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const updateTableConfigSchema = {
  type: Type.OBJECT,
  properties: {
    width: { type: Type.NUMBER, description: "New width in cm (range 100-300)" },
    depth: { type: Type.NUMBER, description: "New depth in cm (range 60-150)" },
    height: { type: Type.NUMBER, description: "New height in cm (range 50-110)" },
    legTaper: { type: Type.NUMBER, description: "New leg tilt taper/spread in cm (range -20 to 20)" },
    topThickness: { type: Type.NUMBER, description: "New tabletop panel thickness in mm (range 10-100)" },
    frameDepth: { type: Type.NUMBER, description: "New supporting frame vertical depth/height in mm (range 20-150)" },
    frameInwardOffset: { type: Type.NUMBER, description: "Inset of the frame from edge (mm)." },
    frameThickness: { type: Type.NUMBER, description: "Width of frame beams (mm). MUST be >= legTopSize." },
    legTopSize: { type: Type.NUMBER, description: "Leg top size (mm). MUST be <= frameThickness." },
    legBottomSize: { type: Type.NUMBER, description: "Leg bottom footprint size (mm)." },
    legInnerDepth: { type: Type.NUMBER, description: "Leg extension from frame (mm)." },
    color: { type: Type.STRING, description: "Hex color code for the material (e.g. #FF0000)" },
    material: { 
      type: Type.STRING, 
      enum: ["oak", "steel", "glass", "chrome", "marble"],
      description: "New material type" 
    },
  },
};

export async function processChatCommand(
  command: string, 
  currentConfig: TableConfig
): Promise<{ config: Partial<TableConfig>; message: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `Config: ${JSON.stringify(currentConfig)}. Cmd: "${command}"` }]
        }
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        systemInstruction: `Expert 3D table configurator (GHX logic). 
        Structure: Top Panel + Hollow Sub-Frame + Tapered Legs.
        Modify: width(cm), depth(cm), height(cm), legTaper(cm), topThickness(mm), frameDepth(mm), frameInwardOffset(mm), frameThickness(mm), legTopSize(mm), legBottomSize(mm), material, color.
        
        CRITICAL CONSTRAINTS:
        1. frameThickness MUST be >= legTopSize to prevent geometry leaking outside the frame.
        2. (frameThickness + legInnerDepth) must be at least 5mm larger than legTopSize for valid pentagon extension.
        3. Total inward extension (inset+thickness+innerDepth) must be < 45% of the half table dimension to prevent center crossing.
        
        If a violation occurs, prioritize maintaining frameThickness >= legTopSize.
        Return JSON with "config" (changes) and "message" (brief explanation).`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            config: updateTableConfigSchema,
            message: { type: Type.STRING }
          },
          required: ["config", "message"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      config: result.config || {},
      message: result.message || "Updated."
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      config: {},
      message: "I'm sorry, I couldn't process that command. Please try again."
    };
  }
}
