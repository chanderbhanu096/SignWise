import { AnalysisSchema } from "../src/types";
import { audioBriefingTurns } from "../src/audio";

export const config = { maxDuration: 60 };

const API_KEY = process.env.ELEVENLABS_API_KEY;
const HOST_VOICE = process.env.ELEVENLABS_HOST_VOICE_ID;
const GUIDE_VOICE = process.env.ELEVENLABS_GUIDE_VOICE_ID;

export default async function handler(req: any, res: any) {
  // A GET asks only whether audio can work here at all. The card hides itself when
  // it cannot: without all three values this endpoint has nothing to answer but 503,
  // and a button that fails every time is worse than no button. This lives in the
  // handler rather than in server.ts because the dev middleware routes every method
  // to the handler too — a probe mounted only on the express side would answer
  // differently in dev than in production.
  if (req.method === "GET") return res.status(200).json({ configured: !!(API_KEY && HOST_VOICE && GUIDE_VOICE) });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!API_KEY || !HOST_VOICE || !GUIDE_VOICE) return res.status(503).json({ error: "audio_not_configured" });

  try {
    const analysis = AnalysisSchema.parse(req.body?.analysis);
    const language = req.body?.language === "de" ? "de" : "en";
    const inputs = audioBriefingTurns(analysis, language).map((turn) => ({
      text: turn.text,
      voice_id: turn.speaker === "host" ? HOST_VOICE : GUIDE_VOICE,
    }));
    if (!inputs.length) return res.status(400).json({ error: "no_briefing_content" });

    const eleven = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": API_KEY },
      body: JSON.stringify({ inputs, model_id: "eleven_v3", language_code: language }),
    });
    if (!eleven.ok) {
      console.error("ElevenLabs audio request failed", eleven.status, await eleven.text());
      return res.status(502).json({ error: "audio_generation_failed" });
    }

    res.status(200);
    res.setHeader("content-type", eleven.headers.get("content-type") ?? "audio/mpeg");
    res.setHeader("cache-control", "no-store");
    return res.end(Buffer.from(await eleven.arrayBuffer()));
  } catch (err: any) {
    console.error("Audio briefing failed", err?.message);
    return res.status(400).json({ error: "invalid_audio_request" });
  }
}
