import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const REVIEW_SYSTEM_PROMPT = `You are reviewing a screenshot of a rendered low-poly 3D model against the text description it was supposed to match.

Before scoring, first identify the single most visually distinctive silhouette feature of the described object (e.g. a cooling tower's hourglass taper, a car's low wide body, a lamp's shade). Check whether the render actually has that feature. If it's missing or clearly wrong, this alone should push the decision to "refine" regardless of how good the overall vibe looks.

Score how well the render matches the description on a 0 to 1 scale.
Decide "continue" if it's a reasonable match for a simple low-poly game asset, or "refine" if something important is clearly wrong (wrong silhouette, wrong shape, missing part, badly wrong proportions, or colors that don't match the described object at all).
Be lenient about minor low-poly stylization — this is not meant to be realistic.

If "refine", give one short, specific, actionable sentence describing what to change.

Respond ONLY with JSON in this exact shape, nothing else:
{"decision": "continue" | "refine", "score": 0.0, "critique": ""}`;

export async function POST(req: NextRequest) {
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
