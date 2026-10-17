import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, ErrorMessage } from '../ui/index.js';
import { SEVERITY_TONE, statusLabel } from '../../lib/constants.js';
import { useChangeIssueStatus, useIssue } from '../../hooks/useIssues.js';
import { pct } from '../../lib/format.js';

function LinkedReports({ id }) {
  const { data, isLoading } = useIssue(id);
  if (isLoading) return <p className="text-xs text-slate-400">Loading…</p>;
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {data.links.map((l) => (
          <li key={l.report._id} className="text-xs">
            <Link to={`/reports/${l.report._id}`} className="font-medium text-slate-700 hover:text-brand-700">{l.report.title}</Link>
            <span className="text-slate-400"> · {l.report.testerId?.name} · {l.report.buildVersion}{l.source === 'ai' ? ' · AI-suggested' : ''}{l.similarity != null ? ` · ${pct(l.similarity)}` : ''}</span>
          </li>
        ))}
        {data.links.length === 0 && <li className="text-xs text-slate-400">No linked reports.</li>}
      </ul>
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer">History</summary>
        <ul className="mt-1 space-y-0.5">
          {data.issue.statusHistory.map((h, i) => (
            <li key={i}>{h.from ? `${statusLabel(h.from)} → ` : ''}{statusLabel(h.to)} · {h.byUserId?.name} {h.note && `· “${h.note}”`}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function IssueCard({ issue, builds, canAct, highlight }) {
  const change = useChangeIssueStatus();
  const [open, setOpen] = useState(highlight);
  const [pendingFix, setPendingFix] = useState(false);
  const laterBuilds = builds.filter((b) => b._id !== issue.buildId?._id);
  const [fixBuild, setFixBuild] = useState(laterBuilds[0]?._id ?? '');

  const move = (status, extra = {}) => {
    let note = '';
    if (status === 'confirmed') {
      const answer = window.prompt('Confirm this bug as real? Optional note:');
      if (answer === null) return;
      note = answer;
    }
    change.mutate({ id: issue._id, status, note, ...extra }, { onSuccess: () => setPendingFix(false) });
  };

  return (
    <div className={`rounded-md border bg-white p-3 shadow-sm ${highlight ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'}`}>
      <button type="button" className="block w-full text-left" onClick={() => setOpen(!open)}>
        <p className="text-sm font-medium text-slate-900">{issue.title}</p>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <Badge tone={SEVERITY_TONE[issue.severity]}>{issue.severity}</Badge>
        <span>{issue.linkCount} report{issue.linkCount === 1 ? '' : 's'}</span>
        <span>· found {issue.buildId?.version}</span>
        {issue.fixedInBuildId && <span>· fixed in {issue.fixedInBuildId.version}</span>}
        {issue.assigneeId && <span>· {issue.assigneeId.name}</span>}
      </div>
      {open && <div className="mt-3 border-t border-slate-100 pt-2"><LinkedReports id={issue._id} /></div>}
      {canAct && issue.allowedTransitions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {issue.allowedTransitions.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === 'confirmed' ? 'primary' : 'secondary'}
              loading={change.isPending && change.variables?.status === s}
              onClick={() => (s === 'fixed' ? setPendingFix(true) : move(s))}
            >
              → {statusLabel(s)}
            </Button>
          ))}
        </div>
      )}
      {pendingFix && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-slate-50 p-2 text-xs">
          <span>Fixed in build</span>
          <select className="rounded border border-slate-300 px-1 py-0.5" value={fixBuild} onChange={(e) => setFixBuild(e.target.value)}>
            {laterBuilds.map((b) => <option key={b._id} value={b._id}>{b.version}</option>)}
          </select>
          <Button size="sm" disabled={!fixBuild} onClick={() => move('fixed', { fixedInBuildId: fixBuild })}>Mark fixed</Button>
          <Button size="sm" variant="ghost" onClick={() => setPendingFix(false)}>Cancel</Button>
          {laterBuilds.length === 0 && <span className="text-amber-700">Create a newer build first.</span>}
        </div>
      )}
      <ErrorMessage error={change.error} className="mt-2" />
    </div>
  );
}
