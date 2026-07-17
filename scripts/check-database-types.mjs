import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const rawGenerated = execFileSync(
  process.execPath,
  [
    'node_modules/supabase/dist/supabase.js',
    'gen',
    'types',
    'typescript',
    '--local',
    '--schema',
    'public',
  ],
  { encoding: 'utf8' },
).replaceAll('\r\n', '\n');
const generated = execFileSync(
  process.execPath,
  [
    'node_modules/prettier/bin/prettier.cjs',
    '--stdin-filepath',
    'src/lib/supabase/database.types.ts',
  ],
  { encoding: 'utf8', input: rawGenerated },
).replaceAll('\r\n', '\n');
const committed = readFileSync(
  'src/lib/supabase/database.types.ts',
  'utf8',
).replaceAll('\r\n', '\n');

if (generated !== committed) {
  console.error('Generated database types are stale. Run npm run db:types.');
  process.exit(1);
}

console.log('Generated database types are current.');
