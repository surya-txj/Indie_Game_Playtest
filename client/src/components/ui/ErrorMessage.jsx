import { apiError } from '../../api/client.js';

/** Renders an Axios error (or a plain `{ message, details }`) in the API's error shape. */
export function ErrorMessage({ error, className = '' }) {
  if (!error) return null;
  const err = error.isAxiosError ? apiError(error) : error;
  return (
    <div role="alert" className={`rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 ${className}`}>
      <p className="font-medium">{err.message}</p>
      {Array.isArray(err.details) && err.details.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {err.details.map((d, i) => (
            <li key={i}>
              {d.path ? `${d.path}: ` : ''}
              {d.message}
            </li>
          ))}
        </ul>
      )}
      {err.details?.allowed && <p className="mt-1 text-xs">Allowed next: {err.details.allowed.join(', ') || 'none'}</p>}
    </div>
  );
}
