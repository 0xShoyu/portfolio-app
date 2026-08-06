import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const REVIEW_SYSTEM_PROMPT = `You are reviewing a dual-view screenshot (Left: 3/4 angle, Right: opposite angle) of a rendered low-poly 3D model against the text description.

IMPORTANT FOR OCCOLUSION: Look at BOTH camera views provided in the image before concluding an item is missing! If an item (like stools, lanterns, wheels) is visible in AT LEAST ONE view, treat it as PRESENT.

Before scoring, identify the single most visually distinctive silhouette feature of the described object.
Score how well the render matches the description on a 0 to 1 scale.
Decide "continue" if it's a reasonable match for a simple low-poly game asset, or "refine" if something important is clearly missing in ALL views or badly wrong in proportion.

If "refine", give one short, specific, actionable sentence describing what to change.

Respond ONLY with JSON in this exact shape, nothing else:
{"decision": "continue" | "refine", "score": 0.0, "critique": ""}`;

export async function reviewModelHandler(req: NextRequest) {
  try {
    const { description, screenshot, apiKey, model } = await req.json();
    if (!description || !screenshot) {
      return NextResponse.json(
        { error: "Missing description or screenshot" },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
    });
    const selectedModel = model || "gemini-3.6-flash";
    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: [
        {
          role: "user",
          parts: [
            { text: `The model was supposed to be: "${description}"` },
            { inlineData: { mimeType: "image/png", data: base64Data } },
          ],
        },
      ],
      config: {
        systemInstruction: REVIEW_SYSTEM_PROMPT,
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const verdict = JSON.parse((response.text ?? "").trim());
    return NextResponse.json(verdict);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Review failed" },
      { status: 500 },
    );
  }
}
