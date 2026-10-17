import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, ErrorMessage, Field } from '../components/ui/index.js';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const DEMO = [
  ['Developer', 'dev1@playtest.dev'],
  ['Coordinator', 'coord1@playtest.dev'],
  ['Tester', 'tester1@playtest.dev'],
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';
  const [error, setError] = useState(null);
  const { register, handleSubmit, setValue, formState } = useForm({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (values) => {
    setError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card title="Log in">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <ErrorMessage error={error} />
          <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
            <input id="email" type="email" autoComplete="email" className="input" {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
            <input id="password" type="password" autoComplete="current-password" className="input" {...register('password')} />
          </Field>
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Log in
          </Button>
          <p className="text-center text-sm text-slate-600">
            No account?{' '}
            <Link to="/register" state={location.state} className="text-brand-700 hover:underline">
              Register
            </Link>
          </p>
        </form>
        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <p className="mb-2">Seeded demo accounts (password <code>Playtest123!</code>):</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map(([label, email]) => (
              <button
                key={email}
                type="button"
                className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                onClick={() => {
                  setValue('email', email);
                  setValue('password', 'Playtest123!');
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
