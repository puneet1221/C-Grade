import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates cryptographically strong 64-byte (512-bit) hex secrets
 * for JWT access and refresh token signing.
 */
export function generateJwtSecrets() {
  return {
    JWT_ACCESS_SECRET: crypto.randomBytes(64).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
  };
}

/**
 * Inserts or updates a key=value entry inside an .env file body.
 * @param {string} content
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
function upsertEnvVar(content, key, value) {
  const lineRegex = new RegExp(`^${key}=.*$`, 'm');
  if (lineRegex.test(content)) {
    return content.replace(lineRegex, `${key}=${value}`);
  }
  const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${suffix}${key}=${value}\n`;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  const shouldWrite = process.argv.includes('--write');
  const secrets = generateJwtSecrets();

  if (shouldWrite) {
    const targetEnvPath = path.resolve(process.cwd(), '.env');
    const exampleEnvPath = path.resolve(process.cwd(), '.env.example');

    let baseContent = '';
    if (fs.existsSync(targetEnvPath)) {
      baseContent = fs.readFileSync(targetEnvPath, 'utf8');
    } else if (fs.existsSync(exampleEnvPath)) {
      baseContent = fs.readFileSync(exampleEnvPath, 'utf8');
    }

    let updated = upsertEnvVar(baseContent, 'JWT_ACCESS_SECRET', secrets.JWT_ACCESS_SECRET);
    updated = upsertEnvVar(updated, 'JWT_REFRESH_SECRET', secrets.JWT_REFRESH_SECRET);
    fs.writeFileSync(targetEnvPath, updated, { encoding: 'utf8', mode: 0o600 });
    console.log(`[C-Grade] Generated random JWT secrets and saved to ${targetEnvPath}`);
  } else {
    console.log(`JWT_ACCESS_SECRET=${secrets.JWT_ACCESS_SECRET}`);
    console.log(`JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`);
  }
}
