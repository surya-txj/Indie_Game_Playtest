import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AiBadge, Badge, Button, ErrorMessage, Field } from '../ui/index.js';
import { CATEGORY_TONE, SEVERITIES, SEVERITY_TONE } from '../../lib/constants.js';
import { formatDate, pct } from '../../lib/format.js';
import { useCreateIssue, useLinkReports } from '../../hooks/useIssues.js';

function CreateIssueForm({ cluster, selected, builds, onDone }) {
  const create = useCreateIssue();
  const [form, setForm] = useState({
    title: cluster.title,
    description: `${cluster.summary}\n\nSuggested repro steps:\n${cluster.mergedReproSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    severity: cluster.severityHint ?? 'medium',
    buildId: cluster.reports[0]?.buildId ?? builds[0]?._id,
  });
  return (
    <form
      className="mt-3 space-y-2 rounded-md bg-slate-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ ...form, reportIds: selected, source: 'ai' }, { onSuccess: onDone });
      }}
    >
      <p className="text-xs text-slate-500">The issue starts as <b>open</b>. Only a developer moving it to <b>confirmed</b> marks the bug as real.</p>
      <Field label="Issue title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Description"><textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Severity">
          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Found in build">
          <select className="input" value={form.buildId} onChange={(e) => setForm({ ...form, buildId: e.target.value })}>
            {builds.map((b) => <option key={b._id} value={b._id}>{b.version}</option>)}
          </select>
        </Field>
      </div>
      <ErrorMessage error={create.error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={create.isPending} disabled={!selected.length}>Create issue and link {selected.length} report(s)</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function LinkExistingForm({ issues, selected, onDone }) {
  const link = useLinkReports();
  const [issueId, setIssueId] = useState(issues[0]?._id ?? '');
  if (!issues.length) return <p className="mt-3 text-sm text-slate-500">No issues in this game yet.</p>;
  return (
    <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-md" value={issueId} onChange={(e) => setIssueId(e.target.value)}>
          {issues.map((i) => <option key={i._id} value={i._id}>{i.title} ({i.status})</option>)}
        </select>
        <Button
          size="sm"
          loading={link.isPending}
          disabled={!selected.length || !issueId}
          onClick={() => link.mutate({ id: issueId, links: selected.map((reportId) => ({ reportId, linkType: 'duplicate', source: 'ai' })) })}
        >
          Link {selected.length} report(s)
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Close</Button>
      </div>
      <ErrorMessage error={link.error} />
      {link.data && (
        <ul className="text-xs">
          {link.data.results.map((r) => (
            <li key={r.reportId} className={r.ok ? 'text-green-700' : 'text-red-700'}>
              {r.ok ? '✓ linked' : `✕ ${r.message}`} · {r.reportId}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClusterCard({ cluster, builds, issues, canAct }) {
  const [selected, setSelected] = useState(() => cluster.reports.filter((r) => !r.lockedAt).map((r) => r._id));
  const [mode, setMode] = useState(null);
  const versions = Object.fromEntries(builds.map((b) => [b._id, b.version]));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <article className="rounded-lg border border-violet-200 bg-white shadow-sm">
      <header className="border-b border-violet-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <AiBadge />
          <Badge tone="amber" title="Popularity is not proof. A developer must confirm.">{cluster.verification}</Badge>
          {cluster.fallbackUsed && <Badge title="The model was unavailable or returned invalid JSON; summary built by rules">heuristic summary</Badge>}
        </div>
        <h3 className="mt-2 text-base font-semibold text-slate-900">{cluster.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{cluster.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Badge tone={CATEGORY_TONE[cluster.category]}>{cluster.category}</Badge>
          <Badge tone={SEVERITY_TONE[cluster.severityHint]}>severity hint: {cluster.severityHint}</Badge>
          <span>confidence {pct(cluster.confidence ?? 0)}</span>
          <span>builds: {cluster.buildsAffected.map((b) => versions[b] ?? '?').join(', ')}</span>
          <span>{formatDate(cluster.firstAt)} – {formatDate(cluster.lastAt)}</span>
        </div>
      </header>
      <div className="space-y-3 px-4 py-3">
        {cluster.mergedReproSteps?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested repro steps</p>
            <ol className="mt-1 list-decimal pl-5 text-sm text-slate-700">
              {cluster.mergedReproSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reports (original wording preserved)</p>
          <ul className="mt-1 space-y-1">
            {cluster.reports.map((r) => (
              <li key={r._id} className="flex items-center gap-2 text-sm">
                {canAct && <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggle(r._id)} aria-label={`Select ${r.title}`} />}
                <Link to={`/reports/${r._id}`} className="truncate hover:text-brand-700">{r.title}</Link>
                {r.lockedAt && <Badge>🔒 linked</Badge>}
                <span className="ml-auto shrink-0 text-xs text-slate-400">{versions[r.buildId]}</span>
              </li>
            ))}
          </ul>
        </div>
        {canAct && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setMode(mode === 'create' ? null : 'create')}>Create issue from cluster</Button>
            <Button size="sm" variant="secondary" onClick={() => setMode(mode === 'link' ? null : 'link')}>Link to existing issue</Button>
          </div>
        )}
        {mode === 'create' && <CreateIssueForm cluster={cluster} selected={selected} builds={builds} onDone={() => setMode(null)} />}
        {mode === 'link' && <LinkExistingForm issues={issues} selected={selected} onDone={() => setMode(null)} />}
      </div>
    </article>
  );
}
