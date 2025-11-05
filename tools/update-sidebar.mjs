// @ts-check
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PATH_PREFIX = 'docspace/javascript-sdk/usage-sdk';
const SIDEBAR_FILE = join(process.cwd(), 'docs', 'typedoc-sidebar.cjs');

try {
  let content = readFileSync(SIDEBAR_FILE, 'utf-8');
  
  content = content.replace(
    /id:\s*"([^"]+)"/g,
    (_, id) => `id: "${PATH_PREFIX}/${id}"`
  );
  
  writeFileSync(SIDEBAR_FILE, content, 'utf-8');
} catch (error) {
  console.error('Error updating sidebar:', error);
  process.exit(1);
}
