import { createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, randomBytes, constants } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Only encrypted backups leave the runner. The private key stays on the operator's machine.
const [operation, input, output, privateKeyPath] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: database-backup.mjs encrypt|decrypt input output [private-key]');
const source = readFileSync(input);
if (operation === 'encrypt') {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encryptedKey = publicEncrypt({ key: process.env.STATS_BACKUP_PUBLIC_KEY, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, key);
  const header = Buffer.from(JSON.stringify({ version: 1, key: encryptedKey.toString('base64'), iv: iv.toString('base64') }) + '\n');
  cipher.setAAD(header);
  const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
  writeFileSync(output, Buffer.concat([header, encrypted, cipher.getAuthTag()]), { mode: 0o600, flag: 'wx' });
} else if (operation === 'decrypt' && privateKeyPath) {
  const split = source.indexOf(10) + 1;
  if (!split) throw new Error('Missing backup header');
  const header = source.subarray(0, split);
  const metadata = JSON.parse(header.toString());
  if (metadata.version !== 1) throw new Error('Unsupported backup format');
  const key = privateDecrypt({ key: readFileSync(privateKeyPath), oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(metadata.key, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(metadata.iv, 'base64'));
  cipher.setAAD(header);
  cipher.setAuthTag(source.subarray(-16));
  const plain = Buffer.concat([cipher.update(source.subarray(split, -16)), cipher.final()]);
  writeFileSync(output, plain, { mode: 0o600, flag: 'wx' });
} else {
  throw new Error('Invalid operation or missing private key');
}
