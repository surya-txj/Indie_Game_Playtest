const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

// Words that tell a developer where or when something happened.
const LOCATION_HINTS =
  /\b(level|stage|world|map|area|zone|room|menu|screen|boss|checkpoint|chapter|mission|quest|inventory|settings|tutorial|cave|forest|bridge|village|after|when|while|before|build|version|v\d)\b/i;

/** Rule-based vague-report check. Returns the reasons, or [] when the report is fine. */
export function vagueReasons(report) {
  const reasons = [];
  if (!report.steps?.length) reasons.push('No reproduction steps');
  if ((report.description ?? '').trim().length < 40) reasons.push('Description is under 40 characters');
  const text = `${report.title} ${report.description} ${(report.steps ?? []).join(' ')}`;
  if (!LOCATION_HINTS.test(text)) reasons.push('No location, timing or build detail');
  return reasons;
}

export function isVague(report) {
  return vagueReasons(report).length >= 2;
}

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Used when the LLM is unavailable or returns invalid JSON twice. */
export function heuristicClusterSummary(reports, meanScore) {
  const longestSteps = reports.reduce((best, r) => ((r.steps?.length ?? 0) > (best.steps?.length ?? 0) ? r : best), reports[0]);
  const highest = reports.reduce(
    (max, r) => (SEVERITY_ORDER.indexOf(r.severity) > SEVERITY_ORDER.indexOf(max) ? r.severity : max),
    'low',
  );
  return {
    title: reports[0].title,
    summary: `${reports.length} testers described a similar problem. Representative report: "${reports[0].description.slice(0, 200)}"`,
    category: mostCommon(reports.map((r) => r.category)),
    severityHint: highest,
    mergedReproSteps: longestSteps.steps ?? [],
    confidence: Number(Math.min(0.95, Math.max(0.3, (meanScore - 0.5) * 2)).toFixed(2)),
  };
}

export function heuristicQuestions(reasons) {
  const questions = [];
  if (reasons.some((r) => r.startsWith('No reproduction'))) {
    questions.push('Could you list the steps you took right before this happened?');
  }
  if (reasons.some((r) => r.startsWith('No location'))) {
    questions.push('Where in the game were you (level, area or menu) when this happened?');
  }
  if (reasons.some((r) => r.startsWith('Description'))) {
    questions.push('What did you expect to happen, and what happened instead?');
  }
  return questions.slice(0, 3);
}
