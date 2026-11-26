import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { loginFormSchema } from '../utils/validators.js';

/**
 * Sign In page supporting email or @username and Remember Me (7d vs 30d).
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false },
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name}`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-7 shadow-2xl">
        <h1 className="font-display text-3xl font-bold text-zinc-50">Sign In</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Enter your email or @username to access your screening diary.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Email or @username
            </label>
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              {...register('identifier')}
              placeholder="you@cinema.org or @username"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-rose-400">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-medium text-zinc-400">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" {...register('rememberMe')} className="h-4 w-4 accent-amber-500" />
            Keep me signed in for 30 days
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          New to C-Grade?{' '}
          <Link to="/register" className="font-semibold text-amber-400 hover:text-amber-300">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
