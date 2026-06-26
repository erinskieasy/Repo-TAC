// Data model for the Opportunity Brief Workbench.

export type SupportingQuestion = {
  id: string;
  prompt: string;
  example: string;
  enabled: boolean;
  answer: string;
};

export type BriefSection = {
  id: number;
  title: string;
  questions: SupportingQuestion[];
  synthesis: string; // the LLM-combined section answer (editable)
  assumptions: string[]; // inferred business logic, each editable
  saved: boolean;
};

export type BriefMetadata = {
  name: string;
  author: string;
  date: string;
  version: string;
};

export type OpportunityBrief = {
  id: string;
  metadata: BriefMetadata;
  executiveSummary: string;
  sections: BriefSection[];
  createdAt: number;
  updatedAt: number;
};

// "Make more executive" / "Add more detail" / "Regenerate" — the per-section refine actions.
export type SynthesisMode = "regenerate" | "executive" | "detail";
