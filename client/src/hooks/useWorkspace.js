import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWorkspace } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * The workspace plus the active studio and game, kept valid: if the stored
 * selection no longer exists, it falls back to the first available one.
 */
export function useWorkspace() {
  const { token, activeStudioId, setActiveStudioId, activeGameId, setActiveGameId } = useAuth();
  const query = useQuery({ queryKey: ['workspace'], queryFn: getWorkspace, enabled: Boolean(token) });
  const ws = query.data;

  const studio = useMemo(
    () => ws?.studios.find((s) => s._id === activeStudioId) ?? ws?.studios[0] ?? null,
    [ws, activeStudioId],
  );
  const games = useMemo(() => (ws && studio ? ws.games.filter((g) => g.studioId === studio._id) : []), [ws, studio]);
  const game = useMemo(() => games.find((g) => g._id === activeGameId) ?? games[0] ?? null, [games, activeGameId]);

  useEffect(() => {
    if (studio && studio._id !== activeStudioId) setActiveStudioId(studio._id);
  }, [studio, activeStudioId, setActiveStudioId]);
  useEffect(() => {
    if (game && game._id !== activeGameId) setActiveGameId(game._id);
  }, [game, activeGameId, setActiveGameId]);

  const builds = useMemo(() => (ws && game ? ws.builds.filter((b) => b.gameId === game._id) : []), [ws, game]);
  const sessions = useMemo(() => (ws && game ? ws.sessions.filter((s) => s.gameId === game._id) : []), [ws, game]);

  return { ...query, ws, studio, games, game, builds, sessions, myRole: studio?.myRole ?? null };
}
