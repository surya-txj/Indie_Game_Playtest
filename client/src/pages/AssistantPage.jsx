import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import * as api from '../api/endpoints.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { AiBadge, Button, Card, ErrorMessage, Spinner } from '../components/ui/index.js';

const EXAMPLES = [
  'What are testers saying about the bridge in the caverns?',
  'Which problems happen around saving or the map?',
  'What do players find frustrating about the boss fight?',
];

export default function AssistantPage() {
  const { studio, game, isLoading } = useWorkspace();
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottom = useRef(null);

  // A thread belongs to one game; switching game starts a new one.
  useEffect(() => {
    setThreadId(null);
    setMessages([]);
  }, [game?._id]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const ask = useMutation({
    mutationFn: (message) => api.askAssistant({ studioId: studio._id, gameId: game._id, threadId: threadId ?? undefined, message }),
    onSuccess: (data) => {
      setThreadId(data.threadId);
      setMessages((m) => [...m, { role: 'assistant', content: data.answer, citations: data.citations, label: data.label }]);
    },
    onError: () => setMessages((m) => m.slice(0, -1)),
  });

  if (isLoading) return <Spinner />;
  if (!game) return <Card title="No game selected"><p className="text-sm text-slate-600">Create a game first.</p></Card>;

  const send = (text) => {
    const message = text.trim();
    if (!message || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setInput('');
    ask.mutate(message);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="page-title">Investigation assistant</h1>
          <p className="text-sm text-slate-600">Ask about {game.title}’s playtest reports. Answers cite the reports they used.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setThreadId(null); setMessages([]); }}>New conversation</Button>
      </div>

      <Card className="min-h-[24rem]">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="space-y-2 text-sm text-slate-600">
              <p>Try one of these:</p>
              {EXAMPLES.map((e) => (
                <button key={e} type="button" className="block rounded border border-slate-200 px-3 py-2 text-left hover:bg-slate-50" onClick={() => send(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'border border-violet-200 bg-violet-50/40 text-slate-800'}`}>
                {m.role === 'assistant' && <div className="mb-2"><AiBadge /></div>}
                <p className="whitespace-pre-line">{m.content}</p>
                {m.citations?.length > 0 && (
                  <div className="mt-3 border-t border-violet-100 pt-2">
                    <p className="text-xs font-semibold text-slate-500">Cited reports</p>
                    <ul className="mt-1 space-y-0.5">
                      {m.citations.map((c) => (
                        <li key={c.reportId}>
                          <Link to={`/reports/${c.reportId}`} className="text-xs text-brand-700 hover:underline">{c.title ?? c.reportId}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {ask.isPending && <Spinner label="Searching reports and thinking…" />}
          <div ref={bottom} />
        </div>
      </Card>

      <ErrorMessage error={ask.error} />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="input" maxLength={1000} placeholder="Ask about the playtest feedback…" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" loading={ask.isPending} disabled={!input.trim()}>Ask</Button>
      </form>
    </div>
  );
}
