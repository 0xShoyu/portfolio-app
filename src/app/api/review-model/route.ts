import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const REVIEW_SYSTEM_PROMPT = `You are reviewing a screenshot of a rendered low-poly 3D model against the text description it was supposed to match.

Score how well the render matches the description on a 0 to 1 scale.
Decide "continue" if it's a reasonable match for a simple low-poly game asset, or "refine" if something important is clearly wrong (wrong shape, missing part, badly wrong proportions).
Be lenient about minor low-poly stylization — this is not meant to be realistic.

If "refine", give one short, specific, actionable sentence describing what to change.

Respond ONLY with JSON in this exact shape, nothing else:
{"decision": "continue" | "refine", "score": 0.0, "critique": ""}`;

export async function POST(req: NextRequest) {
  try {
    const { description, screenshot, apiKey } = await req.json();
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });
    if (!description || !screenshot) {
      return NextResponse.json({ error: 'Missing description or screenshot' }, { status: 400 });
    }

    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `The model was supposed to be: "${description}"` },
            { inlineData: { mimeType: 'image/png', data: base64Data } },
          ],
        },
      ],
      config: {
        systemInstruction: REVIEW_SYSTEM_PROMPT,
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    });

    const verdict = JSON.parse((response.text ?? '').trim());
    return NextResponse.json(verdict);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Review failed' }, { status: 500 });
  }
}
