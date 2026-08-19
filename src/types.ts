import { z } from "zod";

// One schema. It validates the model's output on the server, the fixture in a
// test, and gives the UI its types. Anything that fails this never reaches a screen.

export const LEVELS = ["important", "check", "standard"] as const;
export const DEPTHS = ["simple", "standard", "detailed"] as const;
export const TAGS = ["money", "deadline", "responsibility", "risk"] as const;

export type Level = (typeof LEVELS)[number];
export type Depth = (typeof DEPTHS)[number];
export type Tag = (typeof TAGS)[number];
export type Lang = string; // "de" | "en" | translated codes ("tr", "uk", "ar")

export const ClauseSchema = z.object({
  id: z.string(),
  ref: z.string(), // human label, e.g. "§ 4 Miete · Seite 3"
  page: z.number().int().positive(),
  quote: z.string().min(1), // verbatim from the document — verified before display
  verified: z.boolean(), // set client-side against the extracted text, never by the model
  level: z.enum(LEVELS),
  tags: z.array(z.enum(TAGS)),
  title: z.string(),
  simple: z.object({ simple: z.string(), standard: z.string(), detailed: z.string() }),
  means: z.string(),
  legal: z.string().optional(),
});

export const OneTimeSchema = z.object({
  label: z.string(),
  amount: z.number().nullable(), // null = not stated in the contract (never render as 0)
  ref: z.string().optional(),
});

export const AnalysisSchema = z.object({
  lang: z.string(),
  docLanguage: z.string(),
  contractType: z.string(),
  glance: z.array(
    z.object({ key: z.string(), value: z.string(), derived: z.boolean().optional() }),
  ),
  money: z.object({
    monthly: z.number().nullable(),
    yearly: z.number().nullable(),
    oneTime: z.array(OneTimeSchema),
    variable: z.array(z.object({ label: z.string(), note: z.string() })),
    currency: z.string(),
  }),
  dates: z.array(
    z.object({
      date: z.string(),
      title: z.string(),
      body: z.string(),
      tone: z.enum(["normal", "warning"]),
    }),
  ),
  findings: z.array(z.string()).min(1).max(5), // clause ids, most important first
  rights: z.array(z.object({ clauseId: z.string(), text: z.string() })),
  duties: z.array(z.object({ clauseId: z.string(), text: z.string() })),
  clauses: z.array(ClauseSchema),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string()),
});

export type Clause = z.infer<typeof ClauseSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
