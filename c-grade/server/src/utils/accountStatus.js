/**
 * Computes suspension expiry timestamp from a number of days.
 * @param {number | null | undefined} suspendDays
 * @param {Date} [now]
 * @returns {Date | null}
 */
export function buildSuspensionDate(suspendDays, now = new Date()) {
  if (!suspendDays || Number(suspendDays) <= 0) {
    return null;
  }
  return new Date(now.getTime() + Number(suspendDays) * 24 * 60 * 60 * 1000);
}

/**
 * Evaluates whether a user account is permitted to authenticate or maintain a session.
 * Automatically recognizes expired timed suspensions so callers can restore the user to 'active'.
 *
 * @param {Record<string, any> | null | undefined} user
 * @param {Date} [now]
 * @returns {{ allowed: boolean; autoRestored: boolean; code?: string; message?: string }}
 */
export function evaluateAccountAccess(user, now = new Date()) {
  if (!user) {
    return {
      allowed: false,
      autoRestored: false,
      code: 'missing',
      message: 'User account not found.',
    };
  }

  const status = user.status || 'active';
  if (status === 'active') {
    return { allowed: true, autoRestored: false };
  }

  const reason = typeof user.moderationReason === 'string' ? user.moderationReason.trim() : '';

  if (status === 'blocked') {
    return {
      allowed: false,
      autoRestored: false,
      code: 'blocked',
      message: reason
        ? `Your account has been blocked by an administrator: ${reason}`
        : 'Your account has been blocked by an administrator.',
    };
  }

  if (status === 'suspended') {
    if (user.suspendedUntil) {
      const until = new Date(user.suspendedUntil);
      if (!Number.isNaN(until.getTime())) {
        if (until <= now) {
          return { allowed: true, autoRestored: true };
        }
        const formatted = until.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return {
          allowed: false,
          autoRestored: false,
          code: 'suspended',
          message: reason
            ? `Your account is suspended until ${formatted} (${reason}).`
            : `Your account is suspended until ${formatted}.`,
        };
      }
    }

    return {
      allowed: false,
      autoRestored: false,
      code: 'suspended',
      message: reason
        ? `Your account is currently suspended: ${reason}`
        : 'Your account is currently suspended by an administrator.',
    };
  }

  return { allowed: true, autoRestored: false };
}
