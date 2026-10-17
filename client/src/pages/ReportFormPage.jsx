import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/endpoints.js';
import { Button, Card, ErrorMessage, Field, Spinner } from '../components/ui/index.js';
import { DuplicateHints } from '../components/reports/DuplicateHints.jsx';
import { REPORT_CATEGORIES, SEVERITIES } from '../lib/constants.js';

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Same rules as the server's createReportBody.
const schema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  severity: z.enum(SEVERITIES),
  title: z.string().trim().min(5, 'At least 5 characters').max(120, 'At most 120 characters'),
  description: z.string().trim().min(20, 'At least 20 characters').max(5000),
  steps: z.array(z.object({ value: z.string().trim().max(500) })).max(20),
});

export default function ReportFormPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const { data: session, isLoading, error } = useQuery({ queryKey: ['session', id], queryFn: () => api.getSession(id) });
  const { register, control, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { category: 'bug', severity: 'medium', title: '', description: '', steps: [{ value: '' }] },
  });
  const steps = useFieldArray({ control, name: 'steps' });

  const submit = useMutation({
    mutationFn: (formData) => api.createReport(id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-reports', id] });
      reset();
      setFiles([]);
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  const onFiles = (e) => {
    const chosen = [...e.target.files];
    const bad = chosen.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (chosen.length > MAX_FILES) setFileError(`At most ${MAX_FILES} screenshots`);
    else if (bad) setFileError(`${bad.name}: PNG, JPEG or WebP up to 5 MB only`);
    else {
      setFileError(null);
      setFiles(chosen);
      return;
    }
    e.target.value = '';
    setFiles([]);
  };

  const onSubmit = (values) => {
    const fd = new FormData();
    fd.append('category', values.category);
    fd.append('severity', values.severity);
    fd.append('title', values.title);
    fd.append('description', values.description);
    fd.append('steps', JSON.stringify(values.steps.map((s) => s.value.trim()).filter(Boolean)));
    files.forEach((f) => fd.append('screenshots', f));
    submit.mutate(fd);
  };

  const result = submit.data;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Link to={`/sessions/${id}`} className="text-sm text-brand-700">← {session.title}</Link>
        <h1 className="page-title mt-1">Submit a report</h1>
        <p className="mb-4 text-sm text-slate-600">Build <span className="font-mono">{session.build.version}</span>. Describe one problem per report.</p>
        <Card>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select className="input" {...register('category')}>
                  <option value="bug">Bug: something is broken</option>
                  <option value="confusing">Confusing: unclear instructions or UI</option>
                  <option value="frustration">Frustration: works but feels bad</option>
                </select>
              </Field>
              <Field label="Severity">
                <select className="input" {...register('severity')}>
                  {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Title" error={formState.errors.title?.message}>
              <input className="input" placeholder="e.g. Fell through the floor near the bridge" {...register('title')} />
            </Field>
            <Field label="What happened?" error={formState.errors.description?.message} hint="Where you were, what you did, what you expected and what happened instead.">
              <textarea className="input" rows={5} {...register('description')} />
            </Field>
            <div>
              <span className="label">Steps to reproduce</span>
              <ol className="space-y-2">
                {steps.fields.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs text-slate-400">{i + 1}.</span>
                    <input className="input" {...register(`steps.${i}.value`)} />
                    <Button variant="ghost" size="sm" onClick={() => steps.remove(i)} aria-label="Remove step">✕</Button>
                  </li>
                ))}
              </ol>
              {steps.fields.length < 20 && (
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => steps.append({ value: '' })}>+ Add step</Button>
              )}
            </div>
            <Field
              label="Screenshots"
              error={fileError}
              hint={session.consent.screenshots ? 'Up to 5 PNG, JPEG or WebP images, 5 MB each.' : 'This session does not allow screenshots.'}
            >
              <input type="file" accept={TYPES.join(',')} multiple onChange={onFiles} disabled={!session.consent.screenshots} className="text-sm" />
            </Field>
            {files.length > 0 && <p className="text-xs text-slate-500">{files.map((f) => f.name).join(', ')}</p>}
            <ErrorMessage error={submit.error} />
            <Button type="submit" loading={submit.isPending}>Submit report</Button>
          </form>
        </Card>
      </div>
      <div className="space-y-4 lg:pt-16">
        {result ? (
          <Card title="Report saved ✓">
            <p className="mb-3 text-sm">
              <Link to={`/reports/${result.report._id}`} className="text-brand-700 hover:underline">View your report</Link>. Your original wording is kept exactly as written.
            </p>
            <h3 className="mb-2 text-sm font-semibold">Similar reports from other testers</h3>
            <DuplicateHints items={result.possibleDuplicates} aiStatus={result.aiStatus} />
          </Card>
        ) : (
          <Card title="Tips">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Say where in the game you were (level, area, menu).</li>
              <li>List the exact steps, one per line.</li>
              <li>You can edit your report until the studio links it to an issue.</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
