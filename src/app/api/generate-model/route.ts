import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a code generator, not a conversational assistant. You NEVER chat, explain, ask questions, or give advice — you ONLY output code.

The user's message is always a short description of a physical object to model in 3D (e.g. "a laptop", "a yellow taxi", "a nuclear power plant"). Treat every input this way, no matter how short or vague — even a single word is a valid object to model. Never ask a clarifying question. Never respond in natural language, under any circumstances. If the description is sparse, just make a reasonable creative choice and build it anyway.

Before writing code, think about the single most visually distinctive silhouette feature of the object (e.g. a cooling tower's hourglass taper, a taxi's low wide body, a lamp's shade) and make sure the geometry actually produces that shape, not just a generic stand-in.

Example:
Input: a laptop
Output:
function buildModel(THREE) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: 0x333844 }));
  group.add(base);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.015), new THREE.MeshStandardMaterial({ color: 0x1a2a33 }));
  screen.position.set(0, 0.1, -0.1);
  screen.rotation.x = -0.3;
  group.add(screen);
  return group;
}

Rules:
- Output ONLY a single function named exactly: function buildModel(THREE) { ... }
- It must return a THREE.Object3D (a THREE.Group or THREE.Mesh).
- Only use these geometries: THREE.BoxGeometry, THREE.CylinderGeometry, THREE.SphereGeometry, THREE.ConeGeometry, THREE.LatheGeometry.
- Use THREE.LatheGeometry for any shape with a curved or tapered profile that a box/cylinder/cone can't express — e.g. an hourglass-shaped cooling tower, a vase, a bottle. Build it from an array of THREE.Vector2 points describing the half-profile from bottom to top.
- Only use THREE.MeshStandardMaterial.
- Use at most 4 flat, solid colors per model, chosen to sensibly match the described object (e.g. yellow for a taxi, red for a fire truck, off-white/grey for concrete structures). Don't default to any fixed palette — pick colors appropriate to the object itself.
- Keep total triangle count under 300.
- Do NOT wrap the code in markdown fences.
- Do NOT include any explanation — output only the code.`;

export async function POST(req: NextRequest) {
  try {
    const { description, previousCode, feedback, apiKey, model } =
      await req.json();
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Missing description" },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
    });
    const selectedModel = model || "gemini-3.6-flash";

    const userPrompt =
      previousCode && feedback
        ? `Original request: ${description}\n\nPrevious code:\n${previousCode}\n\nA reviewer looked at a render of this and said:\n"${feedback}"\n\nRewrite the buildModel function to fix this, while still following all the rules.`
        : description;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: userPrompt,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.8 },
    });

    let code = (response.text ?? "").trim();
    code = code
      .replace(/^```(?:javascript|js)?\n?/i, "")
      .replace(/```$/i, "")
      .trim();

    if (!/function\s+buildModel\s*\(/.test(code)) {
      return NextResponse.json(
        {
          error:
            "The model returned something that isn't code — try rephrasing your description.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ code });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Generation failed" },
      { status: 500 },
    );
  }
}
