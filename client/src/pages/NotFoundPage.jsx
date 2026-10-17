import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl">🕳️</p>
      <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">It may not exist, or you may not have access to it.</p>
      <Link to="/" className="mt-4 inline-block text-brand-700 hover:underline">Back to the overview</Link>
    </div>
  );
}
