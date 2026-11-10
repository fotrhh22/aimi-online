/** Applies the approved identity list. Reference candidates never become recommendation evidence. */
const scoreKeys = {
  intelligence: "artificial_analysis_intelligence_index",
  finance: "artificial_analysis_finance_and_accounting_index",
  strategy: "artificial_analysis_strategy_and_ops_index",
  legal: "artificial_analysis_legal_index",
  medical: "artificial_analysis_healthcare_and_medical_index",
  engineering: "artificial_analysis_engineering_index",
  economics: "artificial_analysis_economics_index",
};
const numeric = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
function effort(name) {
  const match = name.match(
    /\((non[- ]?reasoning|reasoning|xhigh|high|medium|low|minimal|max)(?:[,)]|\s)/i,
  );
  return match
    ? match[1].toLowerCase().replace(/non[- ]?reasoning/, "none")
    : null;
}
export function applyCatalogueSelection(
  models,
  aa,
  selection,
  mappings,
  aaAsOf,
) {
  if (selection.models.length !== selection.expectedCount)
    throw Error("INVALID_SELECTION_COUNT");
  const byModel = new Map(models.map((m) => [m.id, m]));
  const byAA = new Map(aa.data.map((a) => [a.id, a]));
  const canonical = new Set();
  return selection.models.map((entry) => {
    const m = byModel.get(entry.id);
    if (!m || m.canonicalId !== entry.canonicalId)
      throw Error("SELECTED_MODEL_IDENTITY_CHANGED: " + entry.id);
    if (canonical.has(m.canonicalId))
      throw Error("DUPLICATE_SELECTED_CANONICAL");
    canonical.add(m.canonicalId);
    if (
      ![m.context, m.maxOutput].every((x) => Number.isFinite(x) && x > 0) ||
      ![m.inputPrice, m.outputPrice].every((x) => Number.isFinite(x) && x >= 0)
    )
      throw Error("MISSING_REQUIRED_MODEL_DATA: " + m.id);
    const profiles = entry.aaCandidateIds
      .map((id) => byAA.get(id))
      .filter(Boolean)
      .map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        indexVersion: String(aa.intelligence_index_version),
        asOf: aaAsOf,
        mappingStatus: mappings.some(
          (map) =>
            map.openrouterId === m.id &&
            map.aaId === a.id &&
            map.reviewed &&
            String(map.indexVersion) === String(aa.intelligence_index_version),
        )
          ? "reviewed"
          : "candidate",
        reasoningEffort: effort(a.name),
        speed: numeric(a.performance?.median_output_tokens_per_second),
        evaluations: Object.fromEntries(
          Object.entries(scoreKeys).map(([key, source]) => [
            key,
            numeric(a.evaluations?.[source]),
          ]),
        ),
      }));
    // Require one real measured profile, not the OR default configuration's presumed speed.
    const measured = profiles.filter((p) => p.speed !== null);
    if (!measured.length) throw Error("SELECTED_AA_SPEED_MISSING: " + m.id);
    measured.sort(
      (a, b) =>
        Number(b.mappingStatus === "reviewed") -
          Number(a.mappingStatus === "reviewed") ||
        Number(b.reasoningEffort === entry.defaultReasoningEffort) -
          Number(a.reasoningEffort === entry.defaultReasoningEffort) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
    const chosen = measured[0];
    return { ...m, aaProfiles: profiles, defaultAAProfileId: chosen.id };
  });
}
