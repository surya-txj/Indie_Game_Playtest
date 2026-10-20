import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { useIssues } from '../hooks/useIssues.js';
import { Card, ErrorMessage, Spinner } from '../components/ui/index.js';
import { IssueCard } from '../components/issues/IssueCard.jsx';
import { BOARD_COLUMNS } from '../lib/constants.js';

export default function IssueBoardPage() {
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const { studio, game, builds, myRole, isLoading: wsLoading } = useWorkspace();
  const { data, isLoading, error } = useIssues(studio?._id, game?._id);

  if (wsLoading || isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!game) return <Card title="No game selected"><p className="text-sm text-slate-600">Create a game first.</p></Card>;

  const items = data?.items ?? [];
  const canAct = myRole === 'developer';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Issue board: {game.title}</h1>
        <p className="text-sm text-slate-600">
          Only the moves the workflow allows are offered. {canAct ? 'Click an issue to see its linked reports.' : 'Read-only for coordinators.'}
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((col) => {
          const colItems = items.filter((i) => col.statuses.includes(i.status));
          return (
            <section key={col.key} className="w-72 shrink-0 rounded-lg bg-slate-100 p-2">
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-slate-700">
                {col.label}
                <span className="rounded-full bg-white px-2 text-xs text-slate-500">{colItems.length}</span>
              </h2>
              <div className="space-y-2">
                {colItems.map((issue) => (
                  <IssueCard key={issue._id} issue={issue} builds={builds} canAct={canAct} highlight={issue._id === focus} />
                ))}
                {colItems.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">Empty</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
