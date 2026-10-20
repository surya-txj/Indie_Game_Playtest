import { api } from './client.js';

const data = (p) => p.then((r) => r.data);

// Auth
export const login = (body) => data(api.post('/auth/login', body));
export const register = (body) => data(api.post('/auth/register', body));
export const me = () => data(api.get('/auth/me'));

// Workspace, studios, games, builds
export const getWorkspace = () => data(api.get('/workspace'));
export const createStudio = (body) => data(api.post('/studios', body));
export const addStudioMember = (studioId, body) => data(api.post(`/studios/${studioId}/members`, body));
export const createGame = (body) => data(api.post('/games', body));
export const createBuild = (body) => data(api.post('/builds', body));
export const setEmbargo = (buildId, body) => data(api.patch(`/builds/${buildId}/embargo`, body));

// Public
export const listPublicGames = (params) => data(api.get('/games', { params }));
export const getPublicPlaytests = (slug) => data(api.get(`/games/${slug}/playtests`));

// Sessions and invitations
export const createSession = (body) => data(api.post('/sessions', body));
export const getSession = (id) => data(api.get(`/sessions/${id}`));
export const getSessionReports = (id, params) => data(api.get(`/sessions/${id}/reports`, { params }));
export const setSessionStatus = (id, status) => data(api.patch(`/sessions/${id}/status`, { status }));
export const inviteTesters = (id, body) => data(api.post(`/sessions/${id}/invitations`, body));
export const acceptInvitation = (token) => data(api.post('/invitations/accept', { token }));
export const publishSummary = (id, publicSummary) => data(api.patch(`/sessions/${id}/publish`, { publicSummary }));

// Reports
export const createReport = (sessionId, formData) => data(api.post(`/sessions/${sessionId}/reports`, formData));
export const getReport = (id) => data(api.get(`/reports/${id}`));
export const updateReport = (id, body) => data(api.patch(`/reports/${id}`, body));
export const deleteReport = (id, reason) => data(api.delete(`/reports/${id}`, { data: { reason } }));
export const getDuplicates = (id) => data(api.get(`/reports/${id}/duplicates`));
export const getScreenshotBlob = (id, file) =>
  data(api.get(`/reports/${id}/screenshots/${file}`, { responseType: 'blob' }));
export const requestClarifications = (id, body) => data(api.post(`/reports/${id}/clarification-requests`, body));
export const answerClarification = (id, body) => data(api.post(`/reports/${id}/clarifications`, body));

// Issues
export const listIssues = (params) => data(api.get('/issues', { params }));
export const getIssue = (id) => data(api.get(`/issues/${id}`));
export const createIssue = (body) => data(api.post('/issues', body));
export const linkReports = (id, links) => data(api.post(`/issues/${id}/report-links`, { links }));
export const changeIssueStatus = (id, body) => data(api.patch(`/issues/${id}/status`, body));
export const assignIssue = (id, assigneeId) => data(api.patch(`/issues/${id}/assignee`, { assigneeId }));

// AI
export const runTriage = (body) => data(api.post('/triage-agent', body));
export const latestTriage = (params) => data(api.get('/triage-runs/latest', { params }));
export const askAssistant = (body) => data(api.post('/playtest-chat', body));
