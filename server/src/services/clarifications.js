import { Clarification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { embedReport } from './embedding.js';

/** Developer-approved questions. Agent drafts only become real through here. */
export async function requestClarifications(report, user, { questions, source }) {
  const docs = await Clarification.insertMany(
    questions.map((question) => ({
      reportId: report._id,
      studioId: report.studioId,
      question,
      askedBy: source,
      askedByUserId: user._id,
    })),
  );
  return { items: docs };
}

/** Allowed even after the report is locked; the answer is folded into the embedding. */
export async function answerClarification(report, { clarificationId, answer }) {
  const clarification = await Clarification.findById(clarificationId);
  if (!clarification || String(clarification.reportId) !== String(report._id)) {
    throw ApiError.badRequest('Clarification does not belong to this report', [
      { path: 'clarificationId', message: 'not a question on this report' },
    ]);
  }
  if (clarification.status !== 'pending') {
    throw ApiError.conflict(`Clarification is already ${clarification.status}`);
  }
  clarification.answer = answer;
  clarification.answeredAt = new Date();
  clarification.status = 'answered';
  await clarification.save();
  await embedReport(report);
  return clarification;
}
