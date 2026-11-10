/** Seven comparable AA indices. Missing measurements remain null, never zero. */
export const AA_SCORE_FIELDS = [
  {
    key: "intelligence",
    label: "종합 성능",
    source: "artificial_analysis_intelligence_index",
  },
  {
    key: "finance",
    label: "재무·회계",
    source: "artificial_analysis_finance_and_accounting_index",
  },
  {
    key: "strategy",
    label: "전략·운영",
    source: "artificial_analysis_strategy_and_ops_index",
  },
  { key: "legal", label: "법률", source: "artificial_analysis_legal_index" },
  {
    key: "medical",
    label: "보건·의료",
    source: "artificial_analysis_healthcare_and_medical_index",
  },
  {
    key: "engineering",
    label: "공학",
    source: "artificial_analysis_engineering_index",
  },
  {
    key: "economics",
    label: "경제",
    source: "artificial_analysis_economics_index",
  },
] as const;
export type AAScoreKey = (typeof AA_SCORE_FIELDS)[number]["key"];
/** One original AA measurement configuration. Never combine values across profiles. */
export type AAProfile = {
  id: string;
  name: string;
  slug: string;
  indexVersion: string;
  asOf: string;
  mappingStatus: "reviewed" | "candidate";
  reasoningEffort: string | null;
  speed: number | null;
  evaluations: Record<AAScoreKey, number | null>;
};
