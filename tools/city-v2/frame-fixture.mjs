import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]);
const {createGame,serialize,routeTo,deserialize}=await import(pathToFileURL(path.join(root,'simulation/source/sim.js')));
const {byId}=await import(pathToFileURL(path.join(root,'simulation/source/geography.js')));
const s=createGame('career',7182);s.nextIncident=9000;for(const u of s.units){u.auto=false;u.route=[];}
routeTo(s.units[0],byId('raekula'));const raw=serialize(s);deserialize(raw);
fs.writeFileSync(path.join(root,'assets/actor-frame-fixture.json'),JSON.stringify({'meridian-watch-v1':raw}));
