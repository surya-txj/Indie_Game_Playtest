import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/endpoints.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { useIssues } from '../hooks/useIssues.js';
import { AiBadge, Badge, Button, Card, ErrorMessage, Spinner } from '../components/ui/index.js';
import { ClusterCard } from '../components/clusters/ClusterCard.jsx';
import { formatDateTime } from '../lib/format.js';

function FlaggedReport({ flag, canAct }) {
  const [chosen, setChosen] = useState(flag.questions);
  const send = useMutation({ mutationFn: () => api.requestClarifications(flag.reportId, { questions: chosen, source: 'agent' }) });
  return (
    <li className="rounded-md border border-slate-200 p-3">
      <Link to={`/reports/${flag.reportId}`} className="font-medium hover:text-brand-700">{flag.report?.title ?? flag.reportId}</Link>
      {flag.report && <p className="mt-1 text-sm text-slate-600">“{flag.report.description}”</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {flag.reasons.map((r) => <Badge key={r} tone="amber">{r}</Badge>)}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Draft questions</p>
      <ul className="mt-1 space-y-1">
        {flag.questions.map((q) => (
          <li key={q} className="flex items-start gap-2 text-sm">
            {canAct && (
              <input
                type="checkbox"
                className="mt-1"
                checked={chosen.includes(q)}
                disabled={send.isSuccess}
                onChange={(e) => setChosen((c) => (e.target.checked ? [...c, q] : c.filter((x) => x !== q)))}
              />
            )}
            {q}
          </li>
        ))}
      </ul>
      {canAct && (
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="secondary" loading={send.isPending} disabled={!chosen.length || send.isSuccess} onClick={() => send.mutate()}>
            {send.isSuccess ? 'Sent to tester ✓' : `Approve and send ${chosen.length}`}
          </Button>
        </div>
      )}
      <ErrorMessage error={send.error} className="mt-2" />
    </li>
  );
}

export default function ClustersPage() {
  const qc = useQueryClient();
  const { studio, game, builds, sessions, myRole, isLoading } = useWorkspace();
  const [scope, setScope] = useState(null);
  const issues = useIssues(studio?._id, game?._id);

  useEffect(() => {
    if (!scope || ![...sessions, ...builds].some((x) => x._id === scope.id)) {
      setScope(sessions[0] ? { kind: 'sessionId', id: sessions[0]._id } : builds[0] ? { kind: 'buildId', id: builds[0]._id } : null);
    }
  }, [sessions, builds, scope]);

  const params = scope ? { [scope.kind]: scope.id } : null;
  const latest = useQuery({ queryKey: ['triage', params], queryFn: () => api.latestTriage(params), enabled: Boolean(params) });
  const run = useMutation({
    mutationFn: () => api.runTriage(params),
    onSuccess: (data) => qc.setQueryData(['triage', params], data),
  });

  if (isLoading) return <Spinner />;
  if (!game) return <Card title="No game selected"><p className="text-sm text-slate-600">Create a game and a session first.</p></Card>;

  const triage = latest.data?.triageRun;
  const canAct = myRole === 'developer';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Linked feedback clusters</h1>
          <p className="text-sm text-slate-600">Reports that describe the same problem in different words, grouped by a local model. Suggestions only.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-72"
            value={scope ? `${scope.kind}:${scope.id}` : ''}
            onChange={(e) => {
              const [kind, id] = e.target.value.split(':');
              setScope({ kind, id });
            }}
          >
            <optgroup label="Sessions">
              {sessions.map((s) => <option key={s._id} value={`sessionId:${s._id}`}>{s.title}</option>)}
            </optgroup>
            <optgroup label="Builds">
              {builds.map((b) => <option key={b._id} value={`buildId:${b._id}`}>Build {b.version}</option>)}
            </optgroup>
          </select>
          <Button onClick={() => run.mutate()} loading={run.isPending} disabled={!params}>
            {run.isPending ? 'Running triage…' : 'Run triage agent'}
          </Button>
        </div>
      </div>

      <ErrorMessage error={run.error || latest.error} />
      {run.isPending && <Spinner label="Embedding, clustering and summarising. A local model can take a minute…" />}
      {latest.isLoading && <Spinner />}

      {!run.isPending && triage === null && (
        <Card><p className="text-sm text-slate-600">No triage run for this scope yet. Click <b>Run triage agent</b>.</p></Card>
      )}

      {triage && !run.isPending && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <AiBadge />
            <span>{triage.reportCount} reports · {triage.clusters.length} clusters · {triage.flaggedReports.length} flagged</span>
            <span>· model {triage.model}</span>
            {triage.fallbackUsed && <Badge tone="amber" title="Some parts used rule-based fallbacks">fallback used</Badge>}
            <span>· {formatDateTime(triage.createdAt)}</span>
          </div>
          {triage.clusters.length === 0 && <Card><p className="text-sm text-slate-600">No groups of similar reports found.</p></Card>}
          <div className="grid gap-4 xl:grid-cols-2">
            {triage.clusters.map((c) => (
              <ClusterCard key={c._id} cluster={c} builds={builds} issues={issues.data?.items ?? []} canAct={canAct} />
            ))}
          </div>
          {triage.flaggedReports.length > 0 && (
            <Card title="Vague reports: suggested follow-up questions" actions={<AiBadge>AI-drafted</AiBadge>}>
              <p className="mb-3 text-xs text-slate-500">Nothing is sent until a developer approves it.</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {triage.flaggedReports.map((f) => <FlaggedReport key={f.reportId} flag={f} canAct={canAct} />)}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
