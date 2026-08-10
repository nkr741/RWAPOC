import * as dotenv from 'dotenv';

dotenv.config();

export interface EnvConfig {
  readonly baseURL: string;
  readonly apiURL: string;
  readonly user: { readonly username: string; readonly password: string };
}

function req(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const ENV: EnvConfig = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiURL: process.env.API_URL || 'http://localhost:3001',
  user: { username: req('QA_USER'), password: req('QA_PASSWORD') },
};
