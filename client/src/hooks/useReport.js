import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { answerClarification, getReport, requestClarifications, updateReport } from '../api/endpoints.js';

export function useReport(id) {
  return useQuery({ queryKey: ['report', id], queryFn: () => getReport(id), enabled: Boolean(id) });
}

function useInvalidateReport(id) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['report', id] });
}

export function useUpdateReport(id) {
  const invalidate = useInvalidateReport(id);
  return useMutation({ mutationFn: (body) => updateReport(id, body), onSuccess: invalidate });
}

export function useAnswerClarification(id) {
  const invalidate = useInvalidateReport(id);
  return useMutation({ mutationFn: (body) => answerClarification(id, body), onSuccess: invalidate });
}

export function useRequestClarifications(id) {
  const invalidate = useInvalidateReport(id);
  return useMutation({ mutationFn: (body) => requestClarifications(id, body), onSuccess: invalidate });
}
