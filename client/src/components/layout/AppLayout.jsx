import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../hooks/useWorkspace.js';

const NAV = [
  { to: '/', label: 'Build overview', roles: ['tester', 'developer', 'coordinator'] },
  { to: '/clusters', label: 'Feedback clusters', roles: ['developer', 'coordinator'] },
  { to: '/issues', label: 'Issue board', roles: ['developer', 'coordinator'] },
  { to: '/assistant', label: 'Investigation assistant', roles: ['developer', 'coordinator'] },
  { to: '/games', label: 'Public games', roles: null },
];

function ScopePicker() {
  const { setActiveStudioId, setActiveGameId } = useAuth();
  const { ws, studio, games, game } = useWorkspace();
  if (!ws || ws.studios.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select
        aria-label="Studio"
        className="rounded-md border border-slate-300 bg-white px-2 py-1"
        value={studio?._id ?? ''}
        onChange={(e) => {
          setActiveStudioId(e.target.value);
          setActiveGameId(null);
        }}
      >
        {ws.studios.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>
      {games.length > 0 && (
        <select
          aria-label="Game"
          className="rounded-md border border-slate-300 bg-white px-2 py-1"
          value={game?._id ?? ''}
          onChange={(e) => setActiveGameId(e.target.value)}
        >
          {games.map((g) => (
            <option key={g._id} value={g._id}>
              {g.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to={user ? '/' : '/games'} className="flex items-center gap-2 font-semibold text-slate-900">
            <span aria-hidden>🎮</span> Playtest Intelligence
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            {user && user.role !== 'tester' && <ScopePicker />}
            {user ? (
              <>
                <span className="text-slate-600">
                  {user.name} <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{user.role}</span>
                </span>
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-800"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900">Log in</Link>
                <Link to="/register" className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
