import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const isCloudflareWorker = typeof globalThis.caches !== 'undefined' && typeof globalThis.WebSocketPair !== 'undefined';

if (!isCloudflareWorker && process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  dotenv.config({ path: path.join(__dirname, '.env') });
  if (!process.env.SUPABASE_URL) {
    dotenv.config();
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: SUPABASE_URL and SUPABASE_KEY must be set.');
  if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    process.exit(1);
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true
  }
});

console.log('Supabase client successfully initialized for URL:', supabaseUrl);
