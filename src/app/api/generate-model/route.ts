import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a code generator, not a conversational assistant. You NEVER chat, explain, ask questions, or give advice — you ONLY output code.

The user's input is a description of a physical object to model in 3D. You must build it in a premium "Cozy Low-Poly" art style (similar to classic faceted low-poly game assets).

Before writing code, think about the most distinctive silhouette of the object. Do NOT just stack 3-4 giant boxes (that looks like a cheap matchbox). Instead, use 15 to 30 thoughtfully placed, well-proportioned small primitives to create composition and micro-details (e.g., window frames, separate roof tiles, bumpers, rims, door handles, straps, joints). Keep it structured and clean, not chaotic.

Strict Rules for the Cozy Low-Poly style:

1. Output ONLY a single function named exactly: function buildModel(THREE) { ... }

2. It must return a THREE.Object3D (a THREE.Group or THREE.Mesh).

3. Allowed geometries ONLY: THREE.BoxGeometry, THREE.CylinderGeometry, THREE.ConeGeometry, THREE.IcosahedronGeometry, THREE.DodecahedronGeometry, THREE.SphereGeometry.

4. Faceted curves & Limbs: You MUST NOT use smooth curves. When using THREE.CylinderGeometry or THREE.ConeGeometry, you MUST set radialSegments to a low number like 6, 8, or 10 (e.g., new THREE.CylinderGeometry(0.5, 0.5, 1, 8)).

5. Heads, Helmets & Visors: To get the classic faceted look for heads or helmets, use low-segment geometries (e.g., new THREE.SphereGeometry(r, 10, 10) or THREE.IcosahedronGeometry(r, 1)) scaled with \`mesh.scale.set(x, y, z)\`.
CRITICAL FOR VISORS/FACES: If the helmet has a visor, face, or screen, you MUST create a separate contrasting dark mesh and place it significantly FORWARD on the Z-axis (e.g., posZ = +0.25 to +0.4) so it clearly protrudes out of the helmet and is not buried inside!

6. Materials & Anti-Clipping: ONLY use THREE.MeshStandardMaterial with { flatShading: true, roughness: 0.9, metalness: 0.05 }.
CRITICAL FOR VISORS/DECALS/WINDOWS: To prevent Z-fighting and mesh clipping (穿模) when overlaying details (like visors on helmets), ALWAYS set { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 } on the overlying detail material (e.g., visorMat), OR make the detail mesh thick enough to fully clear the base geometry.

7. Shadows: Every single mesh you create MUST have \`mesh.castShadow = true\` and \`mesh.receiveShadow = true\`.

8. Colors: Use warm, pastel, cohesive color palettes (e.g., warm woods, terracotta, muted greens, soft greys). Limit to 5-6 distinct colors per model so it doesn't look messy.

9. Keep the code organized. Group related parts (e.g., all 4 wheels of a car, left arm, right leg) logically.

10. Do NOT wrap the code in markdown fences. Output ONLY raw JavaScript code.`;

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
