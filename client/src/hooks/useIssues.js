import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeIssueStatus, createIssue, getIssue, linkReports, listIssues } from '../api/endpoints.js';

export function useIssues(studioId, gameId) {
  return useQuery({
    queryKey: ['issues', studioId, gameId],
    queryFn: () => listIssues({ studioId, gameId }),
    enabled: Boolean(studioId),
  });
}

export function useIssue(id) {
  return useQuery({ queryKey: ['issue', id], queryFn: () => getIssue(id), enabled: Boolean(id) });
}

function useInvalidateIssues() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['issues'] });
    qc.invalidateQueries({ queryKey: ['issue'] });
    qc.invalidateQueries({ queryKey: ['report'] });
  };
}

export function useChangeIssueStatus() {
  const invalidate = useInvalidateIssues();
  return useMutation({ mutationFn: ({ id, ...body }) => changeIssueStatus(id, body), onSuccess: invalidate });
}

export function useCreateIssue() {
  const invalidate = useInvalidateIssues();
  return useMutation({ mutationFn: createIssue, onSuccess: invalidate });
}

export function useLinkReports() {
  const invalidate = useInvalidateIssues();
  return useMutation({ mutationFn: ({ id, links }) => linkReports(id, links), onSuccess: invalidate });
}
