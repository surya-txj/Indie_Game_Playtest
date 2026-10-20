import { Link } from 'react-router-dom';
import { AiBadge } from '../ui/index.js';
import { pct } from '../../lib/format.js';

/** Possible duplicates are hints only: nothing is linked automatically. */
export function DuplicateHints({ items, linkable = false, aiStatus }) {
  if (aiStatus && aiStatus !== 'ready') {
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
        Similar-report check is pending (the local AI is unavailable right now). Your report is saved.
      </p>
    );
  }
  if (!items?.length) return <p className="text-sm text-slate-500">No similar reports found.</p>;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AiBadge />
        <span className="text-xs text-slate-500">Possibly the same problem, unverified</span>
      </div>
      <ul className="space-y-1">
        {items.map((d) => (
          <li key={d.reportId} className="flex items-center justify-between gap-2 rounded border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm">
            {linkable ? (
              <Link to={`/reports/${d.reportId}`} className="truncate text-slate-800 hover:text-brand-700">{d.title}</Link>
            ) : (
              <span className="truncate text-slate-800">{d.title}</span>
            )}
            <span className="shrink-0 font-mono text-xs text-violet-700">{pct(d.score)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
