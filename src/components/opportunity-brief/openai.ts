import type { BriefSection, SynthesisMode } from "./types";
import { WRITING_STYLE } from "./sectionConfig";

// Fixed model string — not exposed to users, not user-configurable (per spec).
// If this model id is unavailable on the account, synthesis falls back to a local draft.
const OPENAI_MODEL = "gpt-5.4";
const WHISPER_MODEL = "whisper-1";
const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";

export type SynthesisResult = {
  answer: string;
  assumptions: string[];
  source: "llm" | "local";
};

function modeInstruction(mode: SynthesisMode): string {
  switch (mode) {
    case "executive":
      return "Rewrite the section answer to be more executive: tighter, outcome-first, persuasive.";
    case "detail":
      return "Expand the section answer with more concrete detail, specifics, and supporting points.";
    default:
      return "Synthesize the responses into a clear, cohesive section answer.";
  }
}

// Local fallback so the whole flow is demoable without an API key.
function localSynthesis(section: BriefSection, mode: SynthesisMode): SynthesisResult {
  const answered = section.questions.filter((question) => question.enabled && question.answer.trim());
  const base = answered.map((question) => question.answer.trim()).join(" ");
  const lead = `For "${section.title.replace(/\?$/, "").toLowerCase()}", `;
  let answer = base ? `${lead}${base}` : `${lead}details still to be captured.`;
  if (mode === "executive") {
    answer = `Bottom line: ${base || "to be defined"}.`;
  } else if (mode === "detail") {
    answer = `${answer} This will be validated with the responsible owners before the executive review.`;
  }
  const assumptions = answered.length
    ? ["Inferred from the supporting answers above — confirm before executive review."]
    : ["No supporting answers yet — this is a placeholder assumption."];
  return { answer, assumptions, source: "local" };
}

export async function synthesizeSection(
  apiKey: string,
  section: BriefSection,
  mode: SynthesisMode,
): Promise<SynthesisResult> {
  if (!apiKey) {
    return localSynthesis(section, mode);
  }

  const responses = section.questions
    .filter((question) => question.enabled)
    .map((question) => `Q: ${question.prompt}\nA: ${question.answer || "(no answer)"}`)
    .join("\n\n");

  const systemPrompt = [
    "You write executive business opportunity briefs.",
    `Writing style: ${WRITING_STYLE}`,
    "Combine the user's responses into one cohesive section answer.",
    "Infer any missing business logic, but list every inference as a separate editable assumption.",
    'Respond ONLY as JSON: {"answer": string, "assumptions": string[]}.',
  ].join(" ");

  const userPrompt = [
    `Section: ${section.title}`,
    modeInstruction(mode),
    section.synthesis ? `Current draft to improve:\n${section.synthesis}` : "",
    `Responses:\n${responses}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);
    return {
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : [],
      source: "llm",
    };
  } catch {
    // Network/model/parse failure — degrade to local synthesis rather than block the user.
    return localSynthesis(section, mode);
  }
}

export type GuidanceResult = { guidance: string; draft: string; source: "llm" | "local" };

// "I'm not sure — help me": coach the user through the current section using everything
// they've already captured, and offer a starting draft they can adapt.
function localGuidance(priorContext: string, section: BriefSection): GuidanceResult {
  const notes = section.questions
    .filter((question) => question.enabled && question.answer.trim())
    .map((question) => question.answer.trim())
    .join(" ");
  const topic = section.title.replace(/\?$/, "").toLowerCase();
  const guidance = priorContext.trim()
    ? `You've already framed earlier sections — keep this consistent with that. For "${topic}", be concrete and tie it back to the problem and the outcome you defined. Two or three plain sentences is plenty.`
    : `Start simple. For "${topic}", write what you'd tell a colleague in two or three sentences. You can refine it after.`;
  const draft = notes
    ? `${notes} (Tighten this into a clear, executive-ready statement.)`
    : `Draft: describe ${topic} in one sentence, then add one concrete detail and why it matters.`;
  return { guidance, draft, source: "local" };
}

export async function getSectionGuidance(
  apiKey: string,
  priorContext: string,
  section: BriefSection,
): Promise<GuidanceResult> {
  if (!apiKey) {
    return localGuidance(priorContext, section);
  }

  const notes = section.questions
    .filter((question) => question.enabled)
    .map((question) => `Q: ${question.prompt}\nA: ${question.answer || "(blank)"}`)
    .join("\n\n");

  const systemPrompt = [
    "You are a product coach helping write an executive business opportunity brief.",
    "The user is unsure how to answer the current section.",
    "Using what they've already captured, give short, encouraging, concrete guidance (2-4 sentences)",
    "and a suggested draft answer they can adapt.",
    'Respond ONLY as JSON: {"guidance": string, "draft": string}.',
  ].join(" ");

  const userPrompt = [
    `Captured so far:\n${priorContext || "(nothing captured yet)"}`,
    `Current section: ${section.title}`,
    `Their notes:\n${notes}`,
  ].join("\n\n");

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI ${response.status}`);
    }
    const data = await response.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    return {
      guidance: typeof parsed.guidance === "string" ? parsed.guidance : "",
      draft: typeof parsed.draft === "string" ? parsed.draft : "",
      source: "llm",
    };
  } catch {
    return localGuidance(priorContext, section);
  }
}

export type TranscriptionResult = { text: string; source: "whisper" | "local" };

export async function transcribeAudio(apiKey: string, audio: Blob): Promise<TranscriptionResult> {
  if (!apiKey) {
    return {
      text: "(Simulated transcript — add an OpenAI API key in Settings to enable Whisper.)",
      source: "local",
    };
  }

  try {
    const form = new FormData();
    form.append("file", audio, "recording.webm");
    form.append("model", WHISPER_MODEL);

    const response = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Whisper ${response.status}`);
    }

    const data = await response.json();
    return { text: typeof data?.text === "string" ? data.text : "", source: "whisper" };
  } catch {
    return {
      text: "(Transcription failed — check your API key or network and try again.)",
      source: "local",
    };
  }
}
