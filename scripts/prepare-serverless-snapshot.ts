import fs from 'node:fs';
import path from 'node:path';

async function main() {
  if (!fs.existsSync('.servobill-deploy-snapshot')) {
    throw new Error('Serverless preparation is allowed only in a disposable deployment snapshot.');
  }
  const { apiEndpoints, eventHandlerEndpoints } = await import('../stack/build-index');
  fs.rmSync('src/app/api', { recursive: true, force: true });
  for (const endpoint of [...apiEndpoints, ...eventHandlerEndpoints]) {
    const file = path.resolve(`${endpoint.file}.ts`);
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes('// Serverless snapshot handler export')) continue;
    fs.writeFileSync(file, `${source}\n// Serverless snapshot handler export\nmodule.exports = { ${endpoint.handler} };\n`);
  }
  console.log('Prepared serverless handlers in the disposable snapshot.');
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
