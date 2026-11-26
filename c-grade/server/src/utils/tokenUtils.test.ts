import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmailVerificationOtp,
  hashToken,
  safeCompareHashes,
} from './tokenUtils.js';

test('createEmailVerificationOtp returns a 6-digit code and matching SHA-256 hash', () => {
  const { code, otpHash, expiresAt } = createEmailVerificationOtp();
  assert.match(code, /^\d{6}$/);
  assert.equal(otpHash, hashToken(code));
  assert.ok(expiresAt instanceof Date && expiresAt.getTime() > Date.now());
});

test('safeCompareHashes validates matching hashes and rejects mismatched or invalid lengths', () => {
  const hashA = hashToken('123456');
  const hashB = hashToken('123456');
  const hashC = hashToken('654321');
  assert.equal(safeCompareHashes(hashA, hashB), true);
  assert.equal(safeCompareHashes(hashA, hashC), false);
  assert.equal(safeCompareHashes(hashA, 'short'), false);
  assert.equal(safeCompareHashes('', hashA), false);
});
