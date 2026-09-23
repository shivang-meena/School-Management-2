import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(__dirname, '../../../.env'),
];

const envPath = candidates.find((candidate) => existsSync(candidate));
if (envPath) loadDotenv({ path: envPath });
