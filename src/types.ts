import { z } from "zod";

// One schema. It validates the model's output on the server, the fixture in a
// test, and gives the UI its types. Anything that fails this never reaches a screen.

export const LEVELS = ["important", "check", "standard"] as const;
export const DEPTHS = ["simple", "standard", "detailed"] as const;
export const TAGS = ["money", "deadline", "responsibility", "risk"] as const;
// Financial framing of the contract, from the user's perspective.
export const CATEGORIES = ["expense", "income", "mixed", "neutral"] as const;

export type Level = (typeof LEVELS)[number];
export type Depth = (typeof DEPTHS)[number];
export type Tag = (typeof TAGS)[number];
export type ContractCategory = (typeof CATEGORIES)[number];
export type Lang = string; // "de" | "en" | translated codes ("tr", "uk", "ar")

// A cited legal provision, e.g. "§ 622 BGB". The model returns only the citation;
// the app maps law + section to an official URL deterministically (see contract.ts),
// so link targets are never model-invented.
export const LegalRefSchema = z.object({
  label: z.string(), // full citation label, e.g. "§ 622 BGB — Kündigungsfristen"
  law: z.string(), // code abbreviation, e.g. "BGB"
  section: z.string().optional(), // e.g. "§ 622"
});

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
  legalRefs: z.array(LegalRefSchema).optional(),
});

// One money line item. Backward compatible: freq/timing/kind are optional.
export const MoneyItemSchema = z.object({
  label: z.string(),
  amount: z.number().nullable(), // null = not stated in the contract (never render as 0)
  ref: z.string().optional(),
  clauseId: z.string().optional(), // exact source when this item is stated in a surfaced clause
  freq: z.enum(["once", "monthly", "annual"]).optional(), // default "once"
  timingMonth: z.number().int().min(0).max(11).nullable().optional(), // 0-11 if a known month
  kind: z.enum(["salary", "rent", "deposit", "bonus", "holiday_pay", "fee", "variable", "other"]).optional(),
});
export const OneTimeSchema = MoneyItemSchema; // legacy alias

export const AnalysisSchema = z.object({
  lang: z.string(),
  docLanguage: z.string(),
  contractType: z.string(),
  glance: z.array(
    z.object({ key: z.string(), value: z.string(), derived: z.boolean().optional(), clauseId: z.string().optional() }),
  ),
  money: z.object({
    monthly: z.number().nullable(),
    yearly: z.number().nullable(),
    monthlyClauseId: z.string().optional(),
    yearlyClauseId: z.string().optional(),
    oneTime: z.array(MoneyItemSchema), // one-time costs (expense) or additional pay (income)
    variable: z.array(z.object({ label: z.string(), note: z.string(), clauseId: z.string().optional() })),
    currency: z.string(),
    // Semantic framing (optional; the app falls back to keyword detection).
    direction: z.enum(["incoming", "outgoing", "mixed", "neutral"]).optional(),
    category: z.enum(CATEGORIES).optional(),
  }),
  dates: z.array(
    z.object({
      date: z.string(),
      title: z.string(),
      body: z.string(),
      tone: z.enum(["normal", "warning"]),
      iso: z.string().optional(), // YYYY-MM-DD, for the calendar export
    }),
  ),
  findings: z.array(z.string()).min(1).max(5), // clause ids, most important first
  rights: z.array(z.object({ clauseId: z.string(), text: z.string() })),
  duties: z.array(z.object({ clauseId: z.string(), text: z.string() })),
  clauses: z.array(ClauseSchema),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string()),
  // Personalized "Before you sign" brief. Optional: the app derives one from the
  // rest of the analysis when the model does not supply it.
  decisionSummary: z
    .object({
      commitments: z.array(
        z.object({ title: z.string(), value: z.string().optional(), explanation: z.string(), clauseId: z.string() }),
      ),
      reviewItems: z.array(
        z.object({ title: z.string(), explanation: z.string(), reason: z.string(), clauseId: z.string() }),
      ),
      understandingQuestions: z
        .array(
          z.object({
            question: z.string().min(1),
            answer: z.string().min(1),
            clauseId: z.string(),
          }),
        )
        .optional(),
      clarificationQuestions: z.array(
        z.object({ question: z.string(), reason: z.string().optional(), clauseId: z.string().optional() }),
      ),
    })
    .optional(),
}).superRefine((analysis, ctx) => {
  // Source traceability is part of the data contract, not just a prompt request.
  // Core analysis references must point at an unambiguous clause. The optional
  // decision brief stays tolerant because the UI drops invalid links, fills from
  // the core analysis, and caps every list before display.
  const clauseIds = new Set(analysis.clauses.map((clause) => clause.id));
  if (clauseIds.size !== analysis.clauses.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Clause ids must be unique",
      path: ["clauses"],
    });
  }
  const check = (clauseId: string | undefined, path: (string | number)[]) => {
    if (clauseId && !clauseIds.has(clauseId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown clauseId: ${clauseId}`,
        path,
      });
    }
  };

  analysis.findings.forEach((id, i) => check(id, ["findings", i]));
  analysis.glance.forEach((item, i) => check(item.clauseId, ["glance", i, "clauseId"]));
  analysis.money.oneTime.forEach((item, i) => check(item.clauseId, ["money", "oneTime", i, "clauseId"]));
  analysis.money.variable.forEach((item, i) => check(item.clauseId, ["money", "variable", i, "clauseId"]));
  check(analysis.money.monthlyClauseId, ["money", "monthlyClauseId"]);
  check(analysis.money.yearlyClauseId, ["money", "yearlyClauseId"]);
  analysis.rights.forEach((item, i) => check(item.clauseId, ["rights", i, "clauseId"]));
  analysis.duties.forEach((item, i) => check(item.clauseId, ["duties", i, "clauseId"]));
});

export type Clause = z.infer<typeof ClauseSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type DecisionSummary = NonNullable<Analysis["decisionSummary"]>;
