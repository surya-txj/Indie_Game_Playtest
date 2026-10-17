import { useState } from 'react';
import { Badge, Button, ErrorMessage } from '../ui/index.js';
import { formatDateTime } from '../../lib/format.js';

function AnswerForm({ clarification, onAnswer, pending }) {
  const [answer, setAnswer] = useState('');
  return (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (answer.trim()) onAnswer({ clarificationId: clarification._id, answer: answer.trim() });
      }}
    >
      <textarea className="input" rows={2} maxLength={2000} placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <Button type="submit" size="sm" loading={pending} disabled={!answer.trim()}>Answer</Button>
    </form>
  );
}

export function ClarificationList({ items, canAnswer, onAnswer, answering, error }) {
  if (!items.length) return <p className="text-sm text-slate-500">No follow-up questions.</p>;
  return (
    <div className="space-y-3">
      <ErrorMessage error={error} />
      {items.map((c) => (
        <div key={c._id} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge tone={c.status === 'answered' ? 'green' : 'amber'}>{c.status}</Badge>
            <span>asked {formatDateTime(c.createdAt)}</span>
            {c.askedBy === 'agent' && <Badge tone="ai">drafted by AI, approved by a developer</Badge>}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800">{c.question}</p>
          {c.answer && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">↳ {c.answer}</p>}
          {canAnswer && c.status === 'pending' && <AnswerForm clarification={c} onAnswer={onAnswer} pending={answering} />}
        </div>
      ))}
    </div>
  );
}
