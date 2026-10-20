import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { Badge, Button, Card, ErrorMessage, Field, Spinner } from '../components/ui/index.js';
import { CATEGORY_TONE, SESSION_STATUSES, SEVERITY_TONE } from '../lib/constants.js';
import { formatDate, formatDateTime, toLocalInput } from '../lib/format.js';

function InvitePanel({ session }) {
  const qc = useQueryClient();
  const [emails, setEmails] = useState('');
  const [expiresAt, setExpiresAt] = useState(toLocalInput(new Date(Date.now() + 14 * 864e5)));
  const [allowList, setAllowList] = useState(true);
  const m = useMutation({
    mutationFn: (body) => api.inviteTesters(session._id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', session._id] });
      qc.invalidateQueries({ queryKey: ['workspace'] });
      setEmails('');
    },
  });
  const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  return (
    <Card title="Invite testers">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate({ emails: list, expiresAt: new Date(expiresAt).toISOString(), addToEmbargoAllowList: session.build.embargoed && allowList });
        }}
      >
        <Field label="Emails" hint="Separate with commas, spaces or new lines (max 50).">
          <textarea className="input" rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} />
        </Field>
        <Field label="Invitation expires">
          <input type="datetime-local" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
        {session.build.embargoed && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={allowList} onChange={(e) => setAllowList(e.target.checked)} />
            This build is embargoed. Also add registered invitees to its allow-list (I confirm they may see it).
          </label>
        )}
        <ErrorMessage error={m.error} />
        <Button type="submit" loading={m.isPending} disabled={!list.length}>Send {list.length || ''} invitation{list.length === 1 ? '' : 's'}</Button>
      </form>
      {m.data && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-xs text-slate-500">Email delivery is simulated: share these one-time links. They are shown only once.</p>
          {m.data.created.map((c) => (
            <div key={c.email} className="rounded bg-slate-50 p-2">
              <p className="font-medium">{c.email}</p>
              <code className="break-all text-xs">{c.inviteUrl}</code>
            </div>
          ))}
          {m.data.alreadyInvited.length > 0 && <p className="text-xs text-amber-700">Already invited: {m.data.alreadyInvited.join(', ')}</p>}
        </div>
      )}
      {session.invitations?.length > 0 && (
        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-slate-500"><tr><th className="py-1">Email</th><th>Status</th><th>Expires</th></tr></thead>
          <tbody>
            {session.invitations.map((i) => (
              <tr key={i._id} className="border-t border-slate-100">
                <td className="py-1">{i.email}</td>
                <td><Badge tone={i.status === 'accepted' ? 'green' : 'slate'}>{i.status}</Badge></td>
                <td>{formatDate(i.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function CoordinatorPanel({ session }) {
  const qc = useQueryClient();
  const [summary, setSummary] = useState(session.publicSummary ?? '');
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['session', session._id] });
    qc.invalidateQueries({ queryKey: ['workspace'] });
  };
  const status = useMutation({ mutationFn: (s) => api.setSessionStatus(session._id, s), onSuccess: invalidate });
  const publish = useMutation({
    mutationFn: () => api.publishSummary(session._id, summary),
    onSuccess: (s) => {
      setSummary(s.publicSummary);
      invalidate();
    },
  });
  return (
    <Card title="Coordinator">
      <div className="space-y-4">
        <Field label="Session status">
          <select className="input" value={session.status} onChange={(e) => status.mutate(e.target.value)} disabled={status.isPending}>
            {SESSION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <ErrorMessage error={status.error} />
        <div>
          <Field
            label="Public summary"
            hint={session.consent.publicSummary ? 'HTML, emails, links and tester names are stripped before publishing.' : 'Testers did not consent to a public summary for this session.'}
          >
            <textarea className="input" rows={4} maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!session.consent.publicSummary} />
          </Field>
          <ErrorMessage error={publish.error} className="mt-2" />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={() => publish.mutate()} loading={publish.isPending} disabled={!session.consent.publicSummary}>Publish sanitized summary</Button>
            {session.publishedAt && <span className="text-xs text-slate-500">published {formatDateTime(session.publishedAt)}</span>}
          </div>
          {session.build.embargoed && session.publishedAt && <p className="mt-1 text-xs text-amber-700">Hidden from the public page while the build is embargoed.</p>}
        </div>
      </div>
    </Card>
  );
}

function ReportsTable({ sessionId, isMember, isCoord }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['session-reports', sessionId, page],
    queryFn: () => api.getSessionReports(sessionId, { page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const del = useMutation({
    mutationFn: ({ id, reason }) => api.deleteReport(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-reports', sessionId] }),
  });
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <>
      <ErrorMessage error={del.error} className="mb-2" />
      {data.items.length === 0 && <p className="text-sm text-slate-500">No reports yet.</p>}
      <ul className="divide-y divide-slate-100">
        {data.items.map((r) => (
          <li key={r._id} className="flex flex-wrap items-center gap-2 py-2">
            <Link to={`/reports/${r._id}`} className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:text-brand-700">{r.title}</Link>
            <Badge tone={CATEGORY_TONE[r.category]}>{r.category}</Badge>
            <Badge tone={SEVERITY_TONE[r.severity]}>{r.severity}</Badge>
            {r.lockedAt && <Badge title="Linked to an issue">🔒 locked</Badge>}
            {r.aiStatus !== 'ready' && <Badge tone="amber" title="Not embedded yet">AI {r.aiStatus}</Badge>}
            {isMember && <span className="text-xs text-slate-500">{r.testerId?.name}</span>}
            <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
            {isCoord && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const reason = window.prompt('Why remove this report? (kept for audit)');
                  if (reason && reason.trim().length >= 3) del.mutate({ id: r._id, reason: reason.trim() });
                }}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>{page} / {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { studio } = useWorkspace();
  const { data: session, isLoading, error } = useQuery({ queryKey: ['session', id], queryFn: () => api.getSession(id) });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  const isTester = user.role === 'tester';
  const myRole = studio?._id === session.studioId ? studio.myRole : null;
  const isCoord = myRole === 'coordinator';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-brand-700">← Overview</Link>
          <h1 className="page-title mt-1">{session.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone={session.status === 'active' ? 'green' : 'slate'}>{session.status}</Badge>
            <span>Build <span className="font-mono">{session.build.version}</span></span>
            {session.build.embargoed && <Badge tone="amber">embargoed</Badge>}
            <span>{formatDateTime(session.startsAt)} – {formatDateTime(session.endsAt)}</span>
          </div>
        </div>
        {isTester && ['active', 'scheduled'].includes(session.status) && (
          <Link to={`/sessions/${id}/report`} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Submit a report</Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Instructions">
            <p className="whitespace-pre-line text-sm text-slate-700">{session.instructions || 'No instructions.'}</p>
            {session.build.notes && <p className="mt-3 text-xs text-slate-500">Build notes: {session.build.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge tone={session.consent.screenshots ? 'green' : 'slate'}>screenshots {session.consent.screenshots ? 'allowed' : 'not allowed'}</Badge>
              <Badge tone={session.consent.publicSummary ? 'green' : 'slate'}>public summary {session.consent.publicSummary ? 'allowed' : 'not allowed'}</Badge>
            </div>
          </Card>
          <Card title={isTester ? 'My reports' : 'Reports'}>
            <ReportsTable sessionId={id} isMember={!isTester} isCoord={isCoord} />
          </Card>
        </div>
        {isCoord && (
          <div className="space-y-6">
            <CoordinatorPanel session={session} />
            <InvitePanel session={session} />
          </div>
        )}
      </div>
    </div>
  );
}
