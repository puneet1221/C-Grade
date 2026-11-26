import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth.js';
import { evaluatePasswordStrength } from '../utils/constants.js';
import { registerFormSchema, verifyEmailFormSchema } from '../utils/validators.js';

/**
 * Two-step Sign Up page: collects account details, emails a 6-digit OTP,
 * and creates the user account only after email ownership is verified.
 */
export function RegisterPage() {
  const { register: startRegistration, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', username: '', email: '', password: '', avatarUrl: '' },
  });

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    reset: resetOtpForm,
    formState: { errors: otpErrors },
  } = useForm({
    resolver: zodResolver(verifyEmailFormSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const passwordValue = watch('password');
  const strength = evaluatePasswordStrength(passwordValue);

  async function onSubmitDetails(values) {
    setSubmitting(true);
    try {
      const result = await startRegistration(values);
      setPendingEmail(result.email || values.email);
      setCooldown(result.resendAfterSeconds ?? 60);
      resetOtpForm({ code: '' });
      toast.success('Verification code sent. Check your inbox to finish creating your account.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to start registration');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode(values) {
    setVerifying(true);
    try {
      const user = await verifyEmail({ email: pendingEmail, code: values.code });
      toast.success(`Email verified! Welcome to C-Grade, ${user.name}`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !pendingEmail) return;
    setResending(true);
    try {
      const result = await resendVerification({ email: pendingEmail });
      setCooldown(result.resendAfterSeconds ?? 60);
      toast.success('A fresh 6-digit verification code has been sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend verification code');
    } finally {
      setResending(false);
    }
  }

  const barColor =
    strength.score >= 4
      ? 'bg-emerald-500'
      : strength.score === 3
        ? 'bg-amber-400'
        : strength.score === 2
          ? 'bg-amber-600'
          : 'bg-rose-500';

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-7 shadow-2xl">
        {pendingEmail ? (
          <div>
            <button
              type="button"
              onClick={() => setPendingEmail('')}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Edit details
            </button>

            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <MailCheck className="h-5 w-5" />
            </div>

            <h1 className="font-display text-2xl font-bold text-zinc-50">Verify Your Email</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              We sent a 6-digit verification code to{' '}
              <span className="font-medium text-zinc-200">{pendingEmail}</span>. Your account is
              created only after verification.
            </p>

            <form onSubmit={handleOtpSubmit(onSubmitCode)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="verify-code" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  6-Digit Verification Code
                </label>
                <input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  {...registerOtp('code')}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.35em] text-amber-400 placeholder:text-zinc-700 focus:border-amber-500/60 focus:outline-none"
                />
                {otpErrors.code && (
                  <p className="mt-1.5 text-xs text-rose-400">{otpErrors.code.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {verifying ? 'Verifying & Creating Account...' : 'Verify & Create Account'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-400">
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                disabled={cooldown > 0 || resending}
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 font-semibold text-amber-400 transition-colors hover:text-amber-300 disabled:cursor-not-allowed disabled:text-zinc-500"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-3xl font-bold text-zinc-50">Join C-Grade</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Enter your details and verify your email address to activate your account.
            </p>

            <form onSubmit={handleSubmit(onSubmitDetails)} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reg-name" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  {...register('name')}
                  placeholder="Satyajit Roy"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                />
                {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>}
              </div>

              <div>
                <label
                  htmlFor="reg-username"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Username
                </label>
                <input
                  id="reg-username"
                  type="text"
                  {...register('username')}
                  placeholder="cinephile_99"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-rose-400">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  {...register('email')}
                  placeholder="you@cinema.org"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                />
                {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  {...register('password')}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                />
                {passwordValue && (
                  <div className="mt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full ${strength.score >= step ? barColor : 'bg-zinc-800'}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">Strength: {strength.label}</p>
                  </div>
                )}
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-avatar"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Avatar URL (optional)
                </label>
                <input
                  id="reg-avatar"
                  type="url"
                  {...register('avatarUrl')}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? 'Sending Verification Code...' : 'Continue & Verify Email'}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
