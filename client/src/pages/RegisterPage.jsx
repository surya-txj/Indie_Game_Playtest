import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, ErrorMessage, Field } from '../components/ui/index.js';
import { ROLES } from '../lib/constants.js';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.enum(ROLES),
});

export default function RegisterPage() {
  const { register: signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';
  const [error, setError] = useState(null);
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: from.startsWith('/invite/') ? 'tester' : 'developer' },
  });

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (values) => {
    setError(null);
    try {
      await signUp(values);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card title="Create an account">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <ErrorMessage error={error} />
          <Field label="Name" htmlFor="name" error={formState.errors.name?.message}>
            <input id="name" className="input" {...register('name')} />
          </Field>
          <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
            <input id="email" type="email" className="input" {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
            <input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} />
          </Field>
          <Field label="I am a…" htmlFor="role" hint="Testers join through an invitation link from a studio.">
            <select id="role" className="input" {...register('role')}>
              <option value="tester">Tester</option>
              <option value="developer">Developer (creates a studio)</option>
              <option value="coordinator">Playtest coordinator</option>
            </select>
          </Field>
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>
            Register
          </Button>
          <p className="text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/login" state={location.state} className="text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
