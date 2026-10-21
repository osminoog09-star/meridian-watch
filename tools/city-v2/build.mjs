import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const native=path.resolve(process.argv[2]);
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:native,stdio:'inherit'});if(r.status!==0)throw Error(`${cmd}: ${r.status}`);}
const manifest=path.join(native,'simulation/source-sha256.json'),data=JSON.parse(fs.readFileSync(manifest));
data.claude_releases+='; Codex City V2 part 1 WIP';data.files=Object.fromEntries(fs.readdirSync(path.join(native,'simulation/source')).filter(n=>n.endsWith('.js')).sort().map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(native,'simulation/source',n))).digest('hex')]));
fs.writeFileSync(manifest,JSON.stringify(data,null,2)+'\n');
run('npm',['ci','--prefix','ui']);
run('ui/node_modules/.bin/esbuild',['simulation/core-entry.js','--bundle','--format=iife','--global-name=MercuryCore','--target=es2020','--metafile=simulation/modules.json','--outfile=simulation/game-core.js']);
run('ui/node_modules/.bin/esbuild',['ui/ui-entry.js','--bundle','--format=iife','--global-name=MercuryUI','--target=es2020','--loader:.html=text','--outfile=ui/ui-bundle.js']);
run('node',['simulation/make-parity-fixtures.mjs']);
