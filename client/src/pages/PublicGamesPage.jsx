import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPublicPlaytests, listPublicGames } from '../api/endpoints.js';
import { Badge, Button, Card, ErrorMessage, Spinner } from '../components/ui/index.js';
import { formatDate } from '../lib/format.js';

function Playtests({ slug }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['public-playtests', slug], queryFn: () => getPublicPlaytests(slug) });
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return (
    <Card title={`${data.game.title}: public playtests`} actions={<Link to="/games" className="text-sm text-brand-700">← All games</Link>}>
      <p className="mb-4 text-sm text-slate-600">{data.game.description}</p>
      {data.sessions.length === 0 && <p className="text-sm text-slate-500">No published playtest summaries yet.</p>}
      <ul className="space-y-3">
        {data.sessions.map((s) => (
          <li key={s._id} className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{s.title}</h3>
              <Badge>{s.status}</Badge>
              <span className="text-xs text-slate-500">
                {formatDate(s.startsAt)} – {formatDate(s.endsAt)}
              </span>
            </div>
            {s.publicSummary && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{s.publicSummary}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function PublicGamesPage() {
  const { slug } = useParams();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-games', search, page],
    queryFn: () => listPublicGames({ q: search || undefined, page, limit: 10 }),
    placeholderData: keepPreviousData,
    enabled: !slug,
  });

  if (slug) return <Playtests slug={slug} />;

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Games recruiting playtesters</h1>
        <p className="text-sm text-slate-600">Public view: no builds, reports or tester details are shown here.</p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <input className="input max-w-sm" placeholder="Search games…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {isLoading && <Spinner />}
      <ErrorMessage error={error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((g) => (
          <Link key={g.slug} to={`/games/${g.slug}`} className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-500">
            <h2 className="font-semibold text-slate-900">{g.title}</h2>
            <p className="text-xs text-slate-500">by {g.studioName}</p>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{g.description}</p>
          </Link>
        ))}
      </div>
      {data && data.items.length === 0 && <p className="text-sm text-slate-500">No games found.</p>}
      {pages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
