import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnswerClarification, useReport, useRequestClarifications, useUpdateReport } from '../hooks/useReport.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { Badge, Button, Card, ErrorMessage, Field, Spinner } from '../components/ui/index.js';
import { ClarificationList } from '../components/reports/ClarificationList.jsx';
import { DuplicateHints } from '../components/reports/DuplicateHints.jsx';
import { Screenshot } from '../components/reports/Screenshot.jsx';
import { CATEGORY_TONE, SEVERITY_TONE, STATUS_TONE, statusLabel } from '../lib/constants.js';
import { formatDateTime, pct } from '../lib/format.js';

function EditForm({ report, onDone }) {
  const update = useUpdateReport(report._id);
  const [form, setForm] = useState({ title: report.title, description: report.description, steps: report.steps.join('\n') });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          { title: form.title, description: form.description, steps: form.steps.split('\n').map((s) => s.trim()).filter(Boolean) },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Description"><textarea className="input" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Steps (one per line)"><textarea className="input" rows={4} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} /></Field>
      <ErrorMessage error={update.error} />
      <div className="flex gap-2">
        <Button type="submit" loading={update.isPending}>Save changes</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function AskQuestions({ reportId }) {
  const ask = useRequestClarifications(reportId);
  const [text, setText] = useState('');
  const questions = text.split('\n').map((q) => q.trim()).filter(Boolean);
  return (
    <form
      className="mt-4 space-y-2 border-t border-slate-100 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        ask.mutate({ questions, source: 'developer' }, { onSuccess: () => setText('') });
      }}
    >
      <Field label="Ask the tester" hint="One question per line, up to 5.">
        <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <ErrorMessage error={ask.error} />
      <Button type="submit" size="sm" loading={ask.isPending} disabled={!questions.length || questions.length > 5}>Send questions</Button>
    </form>
  );
}

function MemberDuplicates({ reportId }) {
  const [enabled, setEnabled] = useState(false);
  const q = useQuery({ queryKey: ['duplicates', reportId], queryFn: () => api.getDuplicates(reportId), enabled });
  if (!enabled) return <Button size="sm" variant="secondary" onClick={() => setEnabled(true)}>Find similar reports</Button>;
  if (q.isLoading) return <Spinner label="Searching…" />;
  if (q.error) return <ErrorMessage error={q.error} />;
  return <DuplicateHints items={q.data.items} linkable />;
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studio } = useWorkspace();
  const { data, isLoading, error } = useReport(id);
  const answer = useAnswerClarification(id);
  const [editing, setEditing] = useState(false);
  const del = useMutation({ mutationFn: (reason) => api.deleteReport(id, reason), onSuccess: () => navigate(-1) });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  const { report, clarifications, links } = data;
  const isOwner = report.testerId?._id === user._id;
  const myRole = studio?._id === report.studioId ? studio.myRole : null;
  const edited = report.editHistory.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/sessions/${report.sessionId}`} className="text-sm text-brand-700">← Session</Link>
        <h1 className="page-title mt-1">{report.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Badge tone={CATEGORY_TONE[report.category]}>{report.category}</Badge>
          <Badge tone={SEVERITY_TONE[report.severity]}>{report.severity}</Badge>
          {report.lockedAt && <Badge title={report.lockedReason}>🔒 locked: {report.lockedReason}</Badge>}
          {report.aiStatus !== 'ready' && <Badge tone="amber">AI {report.aiStatus}</Badge>}
          <span>by {report.testerId?.name ?? 'tester'} · {formatDateTime(report.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title={edited ? 'Current version' : 'Report'}
            actions={
              <>
                {isOwner && !report.lockedAt && !editing && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
                {myRole === 'coordinator' && (
                  <Button
                    size="sm"
                    variant="danger"
                    loading={del.isPending}
                    onClick={() => {
                      const reason = window.prompt('Why remove this report? It stays in the audit trail.');
                      if (reason && reason.trim().length >= 3) del.mutate(reason.trim());
                    }}
                  >
                    Remove
                  </Button>
                )}
              </>
            }
          >
            <ErrorMessage error={del.error} className="mb-3" />
            {editing ? (
              <EditForm report={report} onDone={() => setEditing(false)} />
            ) : (
              <div className="space-y-3 text-sm">
                <p className="whitespace-pre-line text-slate-700">{report.description}</p>
                {report.steps.length > 0 && (
                  <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                    {report.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                )}
              </div>
            )}
            {report.screenshots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {report.screenshots.map((s) => <Screenshot key={s.filename} reportId={report._id} file={s.filename} />)}
              </div>
            )}
          </Card>

          <Card title="Original submission" actions={<Badge>immutable</Badge>}>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{report.originalText}</pre>
            {edited && <p className="mt-2 text-xs text-slate-500">Edited {report.editHistory.length} time(s); last on {formatDateTime(report.editHistory.at(-1).editedAt)}.</p>}
          </Card>

          <Card title="Follow-up questions">
            <ClarificationList
              items={clarifications}
              canAnswer={isOwner}
              onAnswer={(body) => answer.mutate(body)}
              answering={answer.isPending}
              error={answer.error}
            />
            {myRole === 'developer' && <AskQuestions reportId={report._id} />}
          </Card>
        </div>

        {links && (
          <div className="space-y-6">
            <Card title="Linked issues">
              {links.length === 0 && <p className="text-sm text-slate-500">Not linked to any issue.</p>}
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.issue._id} className="text-sm">
                    <Link to={`/issues?focus=${l.issue._id}`} className="font-medium hover:text-brand-700">{l.issue.title}</Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.issue.status && <Badge tone={STATUS_TONE[l.issue.status]}>{statusLabel(l.issue.status)}</Badge>}
                      <Badge>{l.linkType}</Badge>
                      {l.source === 'ai' && <Badge tone="ai">AI-suggested link</Badge>}
                      {l.similarity != null && <Badge>{pct(l.similarity)}</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Similar reports">
              <MemberDuplicates reportId={report._id} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
