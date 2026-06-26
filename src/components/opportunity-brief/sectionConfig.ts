import type { BriefSection, OpportunityBrief } from "./types";

// Hard-coded explainer video placeholder (regular users cannot change this).
export const EXPLAINER_VIDEO_URL = "https://example.com/tac/opportunity-brief-explainer";

// Writing style applied to every synthesis.
export const WRITING_STYLE =
  "Plain operational language with persuasive executive polish.";

type SectionBlueprint = {
  id: number;
  title: string;
  questions: { prompt: string; example: string }[];
};

// The eight required business opportunity sections, each with draft supporting
// questions and example answers.
export const SECTION_BLUEPRINTS: SectionBlueprint[] = [
  {
    id: 1,
    title: "What problem are we solving?",
    questions: [
      {
        prompt: "Who feels the pain, and where does it show up in their day?",
        example: "Delivery leads spend Friday afternoons hand-assembling status from five tools.",
      },
      {
        prompt: "What does this problem cost us today (time, money, risk)?",
        example: "~6 hours/week per lead, and execs still see stale numbers at the steering review.",
      },
    ],
  },
  {
    id: 2,
    title: "What is broken today?",
    questions: [
      {
        prompt: "What is the current workaround, and where does it fail?",
        example: "Manual spreadsheets that drift out of date within a day of being shared.",
      },
      {
        prompt: "What evidence shows this is a real, recurring problem?",
        example: "3 missed escalations last quarter traced to outdated milestone data.",
      },
    ],
  },
  {
    id: 3,
    title: "What does success look like?",
    questions: [
      {
        prompt: "What measurable outcome means we won?",
        example: "Every active project has current evidence at the Day 30 adoption gate.",
      },
      {
        prompt: "How will we know within 30/60/90 days?",
        example: "Adoption gate pass rate rises from 60% to 90% by Day 30.",
      },
    ],
  },
  {
    id: 4,
    title: "What are we building?",
    questions: [
      {
        prompt: "In one sentence, what is the thing?",
        example: "A live project documentation surface that keeps the operating record current.",
      },
      {
        prompt: "What is explicitly in and out of scope for v1?",
        example: "In: status capture + executive export. Out: external integrations.",
      },
    ],
  },
  {
    id: 5,
    title: "How will we build it?",
    questions: [
      {
        prompt: "What is the high-level approach or architecture?",
        example: "Browser-first workbench with local persistence and assisted synthesis.",
      },
      {
        prompt: "What are the major build phases?",
        example: "Phase 1 capture, Phase 2 synthesis, Phase 3 export.",
      },
    ],
  },
  {
    id: 6,
    title: "Who owns each part?",
    questions: [
      {
        prompt: "Who is accountable for delivery overall?",
        example: "Product owner: Jordan R. Engineering lead: Tiffany Tomblin.",
      },
      {
        prompt: "Which roles own which workstreams?",
        example: "Erinski owns synthesis, Mikale owns export & formatting.",
      },
    ],
  },
  {
    id: 7,
    title: "When will it be done?",
    questions: [
      {
        prompt: "What are the key milestones and target dates?",
        example: "Capture flow by Jun 30, export by Jul 15, exec review Jul 30.",
      },
      {
        prompt: "What is the single most important deadline?",
        example: "Executive green-light review on Jul 30.",
      },
    ],
  },
  {
    id: 8,
    title: "What is blocked or at risk?",
    questions: [
      {
        prompt: "What could stop or slow this, and how likely is it?",
        example: "API key provisioning for synthesis — medium likelihood, high impact.",
      },
      {
        prompt: "What decision or dependency do we need from leadership?",
        example: "Approval to use browser-stored keys for the pilot.",
      },
    ],
  },
];

let questionCounter = 0;
function nextQuestionId(): string {
  questionCounter += 1;
  return `q-${questionCounter}`;
}

export function createEmptySections(): BriefSection[] {
  return SECTION_BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id,
    title: blueprint.title,
    synthesis: "",
    assumptions: [],
    saved: false,
    questions: blueprint.questions.map((question) => ({
      id: nextQuestionId(),
      prompt: question.prompt,
      example: question.example,
      enabled: true,
      answer: "",
    })),
  }));
}

export function createBrief(id: string, now: number, author: string): OpportunityBrief {
  const date = new Date(now).toISOString().slice(0, 10);
  return {
    id,
    metadata: { name: "Untitled opportunity", author, date, version: "v0.1" },
    executiveSummary: "",
    sections: createEmptySections(),
    createdAt: now,
    updatedAt: now,
  };
}
