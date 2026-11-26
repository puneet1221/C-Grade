import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/authApi.js';
import { resetPasswordFormSchema } from '../utils/validators.js';

/**
 * Reset Password page consuming the 15-minute reset token and revoking prior sessions.
 */
export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const res = await authApi.resetPassword(token, { password: values.password });
      toast.success(res.message);
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset link invalid or expired');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-7 shadow-2xl">
        <h1 className="font-display text-2xl font-bold text-zinc-50">Set New Password</h1>
        <p className="mt-1.5 text-sm text-zinc-400">Choose a strong new password for your account.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="rp-pw" className="mb-1.5 block text-xs font-medium text-zinc-400">
              New Password
            </label>
            <input
              id="rp-pw"
              type="password"
              {...register('password')}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
            {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="rp-confirm" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Confirm Password
            </label>
            <input
              id="rp-confirm"
              type="password"
              {...register('confirmPassword')}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
