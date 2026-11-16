// Собирает ./game для оболочки: игра из ../pc в один файл (esbuild) + страница и стили.
import {build} from 'esbuild';
import {rm, mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url)), pc = path.join(here, '..', 'pc'), target = path.join(here, 'game');
await rm(target, {recursive: true, force: true});
await mkdir(target, {recursive: true});
await build({entryPoints: [path.join(pc, 'src', 'main.js')], bundle: true, format: 'esm', target: 'chrome130', minify: true, legalComments: 'none',
  outfile: path.join(target, 'app.js'), nodePaths: [path.join(here, 'node_modules')], logLevel: 'warning'});
const html = (await readFile(path.join(pc, 'index.html'), 'utf8')).replace('src="src/main.js"', 'src="app.js"');
await writeFile(path.join(target, 'index.html'), html);
await copyFile(path.join(pc, 'style.css'), path.join(target, 'style.css'));
console.log('Игра собрана в', target);
