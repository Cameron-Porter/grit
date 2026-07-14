/**
 * Generates the Apple client_secret JWT required by Supabase.
 *
 * Usage:
 *   node scripts/generate-apple-secret.mjs \
 *     --key ./AuthKey_XXXXXXXXXX.p8 \
 *     --team-id XXXXXXXXXX \
 *     --key-id XXXXXXXXXX \
 *     --client-id com.gritfitness.app
 *
 * The output JWT is valid for ~6 months. Paste it into:
 *   Supabase → Auth → Providers → Apple → Client Secret
 */

import { createSign } from 'crypto';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const keyFile  = get('--key');
const teamId   = get('--team-id');
const keyId    = get('--key-id');
const clientId = get('--client-id') ?? 'com.gritfitness.app';
const quiet    = args.includes('--quiet');

if (!keyFile || !teamId || !keyId) {
  console.error('Usage: node generate-apple-secret.mjs --key <file.p8> --team-id <TEAM_ID> --key-id <KEY_ID> [--client-id <CLIENT_ID>]');
  process.exit(1);
}

const privateKey = readFileSync(keyFile, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + 15777000; // ~6 months

const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: clientId,
})).toString('base64url');

const data = `${header}.${payload}`;
const sign = createSign('SHA256');
sign.update(data);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }, 'base64url');

const jwt = `${data}.${signature}`;

if (quiet) {
  process.stdout.write(jwt);
} else {
  console.log(`\nClient Secret JWT (valid until ${new Date(exp * 1000).toDateString()}):\n`);
  console.log(`${jwt}\n`);
}
