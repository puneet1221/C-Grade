import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSuspensionDate, evaluateAccountAccess } from './accountStatus.js';

describe('evaluateAccountAccess', () => {
  const fixedNow = new Date('2026-06-15T12:00:00.000Z');

  it('allows active accounts and legacy documents missing status', () => {
    assert.deepEqual(evaluateAccountAccess({ status: 'active' }, fixedNow), {
      allowed: true,
      autoRestored: false,
    });
    assert.deepEqual(evaluateAccountAccess({}, fixedNow), {
      allowed: true,
      autoRestored: false,
    });
  });

  it('rejects blocked accounts with optional reason', () => {
    const blockedNoReason = evaluateAccountAccess({ status: 'blocked' }, fixedNow);
    assert.equal(blockedNoReason.allowed, false);
    assert.equal(blockedNoReason.code, 'blocked');
    assert.match(blockedNoReason.message ?? '', /blocked by an administrator/i);

    const blockedWithReason = evaluateAccountAccess(
      { status: 'blocked', moderationReason: 'Repeated spam' },
      fixedNow
    );
    assert.equal(blockedWithReason.allowed, false);
    assert.match(blockedWithReason.message ?? '', /Repeated spam/);
  });

  it('rejects active timed and indefinite suspensions', () => {
    const future = new Date('2026-06-22T12:00:00.000Z');
    const timed = evaluateAccountAccess(
      { status: 'suspended', suspendedUntil: future, moderationReason: 'Spoiler violation' },
      fixedNow
    );
    assert.equal(timed.allowed, false);
    assert.equal(timed.code, 'suspended');
    assert.match(timed.message ?? '', /Jun 22, 2026/);
    assert.match(timed.message ?? '', /Spoiler violation/);

    const indefinite = evaluateAccountAccess({ status: 'suspended' }, fixedNow);
    assert.equal(indefinite.allowed, false);
    assert.equal(indefinite.code, 'suspended');
    assert.match(indefinite.message ?? '', /currently suspended/i);
  });

  it('auto-restores expired timed suspensions', () => {
    const past = new Date('2026-06-10T12:00:00.000Z');
    const result = evaluateAccountAccess({ status: 'suspended', suspendedUntil: past }, fixedNow);
    assert.deepEqual(result, { allowed: true, autoRestored: true });
  });

  it('computes suspension dates accurately', () => {
    assert.equal(buildSuspensionDate(null, fixedNow), null);
    assert.equal(buildSuspensionDate(0, fixedNow), null);
    const sevenDaysLater = buildSuspensionDate(7, fixedNow);
    assert.equal(sevenDaysLater?.toISOString(), '2026-06-22T12:00:00.000Z');
  });
});
