declare const process: any;

export type AiMiniTest = {
  title: string;
  durationSec: number;
  instruction: string;
  skillTag: string;
};

export type AiProfile = {
  profileBlurb: string;
  focusAreas: string[];
  miniTests: AiMiniTest[];
};

type GenerateInput = {
  levelLabel: string;
  description: string;
  instrument?: string;
  useMock?: boolean;
};

const sanitize = (text: string) =>
  text
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const mockResponse = (levelLabel: string, description: string): AiProfile => ({
  profileBlurb: sanitize(
    `${levelLabel} vibe: ${description || "Ready to start"} — you’ll grow timing, reading, and feel with quick wins.`
  ).slice(0, 300),
  focusAreas: ["Timing & Groove", "Confident Note Finding", "Dynamic Control"],
  miniTests: [
    {
      title: "Steady 4 Count",
      durationSec: 20,
      instruction: "Clap or tap 4 beats with me at a comfy speed. Keep them even!",
      skillTag: "timing"
    },
    {
      title: "C-E-G Spark",
      durationSec: 20,
      instruction: "Play C-E-G together or one by one, hold for 4 beats, and repeat twice.",
      skillTag: "pitch"
    }
  ]
});

export const generateProfileAndTests = async (input: GenerateInput): Promise<AiProfile> => {
  const { levelLabel, description, instrument = "piano", useMock } = input;
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback to mock if key missing or mock requested
  if (!apiKey || useMock) {
    return mockResponse(levelLabel, description);
  }

  const prompt = `
You are crafting an encouraging plan for a kid learning ${instrument}.
Level: ${levelLabel}.
Self description: "${description || "No description"}".
Return concise JSON with fields: profileBlurb (<=300 chars, upbeat, no PII), focusAreas (3 short strings), miniTests (2 objects each with title, durationSec<=30, instruction, skillTag among timing|pitch|dynamics|coordination).
Use simple ASCII, kid-friendly tone, avoid heavy theory, avoid metronome over 80 bpm for beginners.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini error: ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Attempt to parse JSON block from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Malformed Gemini response");
    const parsed = JSON.parse(jsonMatch[0]);

    const profileBlurb = sanitize(parsed.profileBlurb || "").slice(0, 300);
    const focusAreas = Array.isArray(parsed.focusAreas)
      ? parsed.focusAreas.map((f: string) => sanitize(f)).filter(Boolean).slice(0, 3)
      : [];
    const miniTests = Array.isArray(parsed.miniTests)
      ? parsed.miniTests.slice(0, 2).map((t: any) => ({
          title: sanitize(t.title || "Mini Test"),
          durationSec: Math.min(30, Number(t.durationSec) || 20),
          instruction: sanitize(t.instruction || "Follow the beat."),
          skillTag: sanitize(t.skillTag || "timing")
        }))
      : [];

    if (!profileBlurb || focusAreas.length === 0 || miniTests.length === 0) {
      throw new Error("Incomplete Gemini response");
    }

    return { profileBlurb, focusAreas, miniTests };
  } catch (err) {
    if (__DEV__) {
      console.warn("Gemini fallback due to error:", err);
    }
    return mockResponse(levelLabel, description);
  }
};
