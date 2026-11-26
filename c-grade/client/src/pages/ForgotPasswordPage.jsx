import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi.js';
import { forgotPasswordFormSchema } from '../utils/validators.js';

/**
 * Forgot Password page dispatching a 15-minute Gmail SMTP reset link.
 */
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordFormSchema),
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(values);
      toast.success(res.message);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to process request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-7 shadow-2xl">
        <h1 className="font-display text-2xl font-bold text-zinc-50">Forgot Password</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Enter your account email and we will send a 15-minute reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Check your inbox (or server console in local preview) for your reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label htmlFor="fp-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Email Address
              </label>
              <input
                id="fp-email"
                type="email"
                {...register('email')}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
