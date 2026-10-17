/** The immutable snapshot of what the tester first wrote. */
export function buildOriginalText({ title, description, steps = [] }) {
  const lines = [title.trim(), '', description.trim()];
  if (steps.length) {
    lines.push('', 'Steps:');
    steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  return lines.join('\n');
}

/** Text that gets embedded: current wording, category and any clarification answers. */
export function buildEmbeddingText(report, clarifications = []) {
  const parts = [`[${report.category}] ${report.title}`, report.description];
  if (report.steps?.length) parts.push(`Steps: ${report.steps.join(' | ')}`);
  for (const c of clarifications) {
    if (c.status === 'answered' && c.answer) parts.push(`Q: ${c.question} A: ${c.answer}`);
  }
  return parts.join('\n');
}

/** Report text for LLM prompts, with tester-controlled content clearly delimited. */
export function reportPromptBlock(report, maxDescription = 800) {
  const description = report.description.length > maxDescription
    ? `${report.description.slice(0, maxDescription)}…`
    : report.description;
  const steps = report.steps?.length ? `\nSteps:\n${report.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '';
  // Neutralise any closing tag the tester typed so it cannot break out of the block.
  const body = `Title: ${report.title}\nCategory: ${report.category}\nSeverity: ${report.severity}\nDescription: ${description}${steps}`
    .replace(/<\/?report[^>]*>/gi, '[tag removed]');
  return `<report id="${report._id}">\n${body}\n</report>`;
}
