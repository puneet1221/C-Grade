import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth.js';
import { verifyEmailFormSchema } from '../utils/validators.js';

/**
 * Email verification landing page supporting direct verification links
 * from the verification email (?email=...&code=...) as well as manual entry.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialCode = searchParams.get('code') || '';
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const autoAttemptedRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(verifyEmailFormSchema),
    defaultValues: { code: initialCode },
  });

  useEffect(() => {
    if (autoAttemptedRef.current) return;
    if (!initialEmail || !/^\d{6}$/.test(initialCode)) return;
    autoAttemptedRef.current = true;

    setSubmitting(true);
    verifyEmail({ email: initialEmail, code: initialCode })
      .then((user) => {
        toast.success(`Email verified! Welcome to C-Grade, ${user.name}`);
        navigate('/');
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Verification failed or expired.';
        setErrorMessage(msg);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [initialEmail, initialCode, verifyEmail, navigate]);

  async function onSubmit(values) {
    if (!email.trim()) {
      setErrorMessage('Enter the email address used during sign up.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    try {
      const user = await verifyEmail({ email: email.trim(), code: values.code });
      toast.success(`Email verified! Welcome to C-Grade, ${user.name}`);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-7 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <MailCheck className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-bold text-zinc-50">Complete Email Verification</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Confirm your 6-digit verification code to create and activate your C-Grade account.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="ve-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Email Address
            </label>
            <input
              id="ve-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cinema.org"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ve-code" className="mb-1.5 block text-xs font-medium text-zinc-400">
              6-Digit Verification Code
            </label>
            <input
              id="ve-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              {...register('code')}
              placeholder="000000"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.35em] text-amber-400 placeholder:text-zinc-700 focus:border-amber-500/60 focus:outline-none"
            />
            {errors.code && <p className="mt-1 text-xs text-rose-400">{errors.code.message}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Verify & Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Need a fresh code?{' '}
          <Link to="/register" className="font-semibold text-amber-400 hover:text-amber-300">
            Back to Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
