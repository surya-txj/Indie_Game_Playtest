import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { Badge, Button, Card, ErrorMessage, Field, Spinner } from '../components/ui/index.js';
import { formatDate, toLocalInput } from '../lib/format.js';

function useWorkspaceMutation(fn, onDone) {
  const qc = useQueryClient();
  const { refreshMe } = useAuth();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ['workspace'] });
      await refreshMe();
      onDone?.(data);
    },
  });
}

function CreateStudio() {
  const [name, setName] = useState('');
  const m = useWorkspaceMutation(api.createStudio, () => setName(''));
  return (
    <Card title="Create your studio">
      <p className="mb-3 text-sm text-slate-600">A studio is your private workspace. You will be its first developer.</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate({ name }); }}>
        <input className="input" placeholder="Studio name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" loading={m.isPending}>Create</Button>
      </form>
      <ErrorMessage error={m.error} className="mt-3" />
    </Card>
  );
}

const gameSchema = z.object({
  title: z.string().trim().min(2, 'At least 2 characters'),
  description: z.string().max(2000).optional(),
  publicRecruitment: z.boolean(),
});

function CreateGame({ studioId }) {
  const { setActiveGameId } = useAuth();
  const { register, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(gameSchema),
    defaultValues: { publicRecruitment: false },
  });
  const m = useWorkspaceMutation(api.createGame, (game) => {
    reset();
    setActiveGameId(game._id);
  });
  return (
    <Card title="New game">
      <form className="space-y-3" onSubmit={handleSubmit((v) => m.mutate({ ...v, studioId }))}>
        <Field label="Title" error={formState.errors.title?.message}>
          <input className="input" {...register('title')} />
        </Field>
        <Field label="Description">
          <textarea className="input" rows={2} {...register('description')} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('publicRecruitment')} /> List publicly for tester recruitment
        </label>
        <ErrorMessage error={m.error} />
        <Button type="submit" loading={m.isPending}>Create game</Button>
      </form>
    </Card>
  );
}

function CreateBuild({ gameId, testers }) {
  const [form, setForm] = useState({ version: '', notes: '', embargoed: false, allowedViewers: [] });
  const m = useWorkspaceMutation(api.createBuild, () => setForm({ version: '', notes: '', embargoed: false, allowedViewers: [] }));
  return (
    <Card title="New build">
      <p className="mb-3 text-xs text-slate-500">Builds are metadata only. No game files are uploaded or run.</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate({ ...form, gameId }); }}>
        <Field label="Version">
          <input className="input" placeholder="1.1.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
        </Field>
        <Field label="Notes">
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.embargoed} onChange={(e) => setForm({ ...form, embargoed: e.target.checked })} />
          Embargoed (hidden from testers not on the allow-list)
        </label>
        {form.embargoed && <ViewerPicker users={testers} value={form.allowedViewers} onChange={(allowedViewers) => setForm({ ...form, allowedViewers })} />}
        <ErrorMessage error={m.error} />
        <Button type="submit" loading={m.isPending}>Create build</Button>
      </form>
    </Card>
  );
}

function ViewerPicker({ users, value, onChange }) {
  if (!users.length) return <p className="text-xs text-slate-500">No testers have joined this studio’s sessions yet.</p>;
  return (
    <fieldset className="rounded-md border border-slate-200 p-2">
      <legend className="px-1 text-xs text-slate-500">Allowed testers</legend>
      {users.map((u) => (
        <label key={u._id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.includes(u._id)}
            onChange={(e) => onChange(e.target.checked ? [...value, u._id] : value.filter((v) => v !== u._id))}
          />
          {u.name} <span className="text-xs text-slate-400">{u.email}</span>
        </label>
      ))}
    </fieldset>
  );
}

function EmbargoEditor({ build, testers }) {
  const [open, setOpen] = useState(false);
  const [embargoed, setEmbargoed] = useState(build.embargoed);
  const [allowed, setAllowed] = useState(build.allowedViewers ?? []);
  const m = useWorkspaceMutation((body) => api.setEmbargo(build._id, body), () => setOpen(false));
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Embargo…</Button>;
  return (
    <div className="mt-2 w-full space-y-2 rounded-md bg-slate-50 p-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={embargoed} onChange={(e) => setEmbargoed(e.target.checked)} /> Embargoed
      </label>
      {embargoed && <ViewerPicker users={testers} value={allowed} onChange={setAllowed} />}
      <ErrorMessage error={m.error} />
      <div className="flex gap-2">
        <Button size="sm" loading={m.isPending} onClick={() => m.mutate({ embargoed, allowedViewers: embargoed ? allowed : [] })}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function CreateSession({ builds }) {
  const now = new Date();
  const [form, setForm] = useState({
    buildId: builds[0]?._id ?? '',
    title: '',
    instructions: '',
    startsAt: toLocalInput(now),
    endsAt: toLocalInput(new Date(now.getTime() + 7 * 864e5)),
    status: 'active',
    consent: { screenshots: true, publicSummary: false },
  });
  const m = useWorkspaceMutation(api.createSession, () => setForm((f) => ({ ...f, title: '', instructions: '' })));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  if (!builds.length) return null;
  return (
    <Card title="Schedule a session">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate({ ...form, buildId: form.buildId || builds[0]._id, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() });
        }}
      >
        <Field label="Build">
          <select className="input" value={form.buildId} onChange={set('buildId')}>
            {builds.map((b) => <option key={b._id} value={b._id}>{b.version}{b.embargoed ? ' (embargoed)' : ''}</option>)}
          </select>
        </Field>
        <Field label="Title"><input className="input" value={form.title} onChange={set('title')} /></Field>
        <Field label="Instructions for testers"><textarea className="input" rows={3} value={form.instructions} onChange={set('instructions')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Starts"><input type="datetime-local" className="input" value={form.startsAt} onChange={set('startsAt')} /></Field>
          <Field label="Ends"><input type="datetime-local" className="input" value={form.endsAt} onChange={set('endsAt')} /></Field>
        </div>
        <Field label="Status">
          <select className="input" value={form.status} onChange={set('status')}>
            {['draft', 'scheduled', 'active'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <fieldset className="space-y-1 text-sm">
          <legend className="label">Tester consent</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.consent.screenshots} onChange={(e) => setForm({ ...form, consent: { ...form.consent, screenshots: e.target.checked } })} />
            Screenshots may be attached and viewed by the studio
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.consent.publicSummary} onChange={(e) => setForm({ ...form, consent: { ...form.consent, publicSummary: e.target.checked } })} />
            A sanitized summary may be published on the public game page
          </label>
        </fieldset>
        <ErrorMessage error={m.error} />
        <Button type="submit" loading={m.isPending}>Create session</Button>
      </form>
    </Card>
  );
}

function AddMember({ studioId }) {
  const [form, setForm] = useState({ email: '', role: 'coordinator' });
  const m = useWorkspaceMutation((body) => api.addStudioMember(studioId, body), () => setForm({ email: '', role: 'coordinator' }));
  return (
    <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate(form); }}>
      <input className="input max-w-xs" placeholder="colleague@studio.dev" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <select className="input w-40" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="developer">developer</option>
        <option value="coordinator">coordinator</option>
      </select>
      <Button type="submit" variant="secondary" loading={m.isPending}>Add member</Button>
      <ErrorMessage error={m.error} className="w-full" />
    </form>
  );
}

function SessionList({ sessions, builds, isTester }) {
  const version = Object.fromEntries(builds.map((b) => [b._id, b]));
  if (!sessions.length) return <p className="text-sm text-slate-500">No sessions yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map((s) => (
        <li key={s._id} className="flex flex-wrap items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <Link to={`/sessions/${s._id}`} className="font-medium text-slate-900 hover:text-brand-700">{s.title}</Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{s.status}</Badge>
              <span>build {version[s.buildId]?.version ?? '?'}</span>
              {version[s.buildId]?.embargoed && <Badge tone="amber">embargoed</Badge>}
              <span>{formatDate(s.startsAt)} – {formatDate(s.endsAt)}</span>
              {s.publishedAt && <Badge tone="blue">summary published</Badge>}
            </div>
          </div>
          {isTester && ['active', 'scheduled'].includes(s.status) && (
            <Link to={`/sessions/${s._id}/report`} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">Submit report</Link>
          )}
          <Link to={`/sessions/${s._id}`} className="text-sm text-brand-700 hover:underline">{isTester ? 'My reports' : 'Open'}</Link>
        </li>
      ))}
    </ul>
  );
}

export default function BuildOverviewPage() {
  const { user } = useAuth();
  const { ws, studio, game, games, builds, sessions, myRole, isLoading, error } = useWorkspace();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  if (user.role === 'tester') {
    const allBuilds = ws.builds;
    return (
      <div className="space-y-4">
        <h1 className="page-title">Your playtests</h1>
        <Card title="Invited sessions">
          {ws.sessions.length === 0 ? (
            <p className="text-sm text-slate-600">You have no sessions yet. Open the invitation link a studio sent you to join one.</p>
          ) : (
            <SessionList sessions={ws.sessions} builds={allBuilds} isTester />
          )}
        </Card>
      </div>
    );
  }

  if (!studio) {
    return user.role === 'developer' ? (
      <div className="mx-auto max-w-lg"><CreateStudio /></div>
    ) : (
      <Card title="No studio yet">
        <p className="text-sm text-slate-600">Ask a studio developer to add <b>{user.email}</b> as a coordinator.</p>
      </Card>
    );
  }

  const testerUsers = studio.testers ?? [];
  const isDev = myRole === 'developer';
  const isCoord = myRole === 'coordinator';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="page-title">{game ? game.title : studio.name}</h1>
          <p className="text-sm text-slate-600">
            {studio.name} · you are a <b>{myRole}</b>
            {game && <> · {game.publicRecruitment ? <Link className="text-brand-700 hover:underline" to={`/games/${game.slug}`}>public page</Link> : 'private game'}</>}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {game ? (
            <>
              <Card title="Builds">
                {builds.length === 0 && <p className="text-sm text-slate-500">No builds yet.</p>}
                <ul className="divide-y divide-slate-100">
                  {builds.map((b) => (
                    <li key={b._id} className="flex flex-wrap items-center gap-2 py-3">
                      <span className="font-mono text-sm font-medium">{b.version}</span>
                      {b.embargoed ? <Badge tone="amber">embargoed · {b.allowedViewers.length} allowed</Badge> : <Badge tone="green">open</Badge>}
                      <span className="text-xs text-slate-500">released {formatDate(b.releasedAt)}</span>
                      <span className="w-full text-sm text-slate-600 sm:w-auto sm:flex-1">{b.notes}</span>
                      {isCoord && <EmbargoEditor build={b} testers={testerUsers} />}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Sessions">
                <SessionList sessions={sessions} builds={builds} />
              </Card>
            </>
          ) : (
            <Card title="No games yet">
              <p className="text-sm text-slate-600">{isDev ? 'Create the first game for this studio.' : 'A developer needs to create a game first.'}</p>
            </Card>
          )}
          <Card title="Studio members">
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {studio.members.map((m) => (
                <li key={m.userId}>{m.name} <span className="text-xs text-slate-500">· {m.role}</span></li>
              ))}
            </ul>
            {isDev && <AddMember studioId={studio._id} />}
          </Card>
        </div>
        <div className="space-y-6">
          {isDev && <CreateGame studioId={studio._id} />}
          {isDev && game && <CreateBuild gameId={game._id} testers={testerUsers} />}
          {isCoord && game && <CreateSession key={game._id} builds={builds} />}
          {games.length > 1 && <p className="text-xs text-slate-500">Switch games with the selector in the top bar.</p>}
        </div>
      </div>
    </div>
  );
}
