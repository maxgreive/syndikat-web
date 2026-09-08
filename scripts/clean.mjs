import fs from 'node:fs/promises';
// Only remove the generated output next to this repository's package.json.
await fs.rm(new URL('../_site/', import.meta.url), { recursive: true, force: true });
