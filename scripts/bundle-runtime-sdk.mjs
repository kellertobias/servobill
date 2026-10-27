import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

// This tiny OpenNext helper otherwise imports the managed runtime's SDK using
// AWS's ESM NODE_PATH extension. Bundle its SDK explicitly for upstream Node.
const file = path.resolve('.open-next/dynamodb-provider/index.mjs');
const result = await build({
  stdin: {
    contents: await readFile(file, 'utf8'),
    resolveDir: path.dirname(file),
    sourcefile: 'index.mjs',
  },
  outfile: file,
  allowOverwrite: true,
  metafile: true,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  banner: {
    js: 'import { createRequire as nodeSecurityCreateRequire } from "node:module"; const require = nodeSecurityCreateRequire(import.meta.url);',
  },
});
if (Object.values(result.metafile.outputs).some(output =>
  output.imports.some(item => item.external && item.path.startsWith('@aws-sdk/')),
)) {
  throw new Error('The seeder still depends on an external runtime AWS SDK');
}
console.log('Bundled the revalidation seeder AWS SDK into its deployment artifact');
