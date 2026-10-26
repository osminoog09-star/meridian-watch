import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [source,out]=process.argv.slice(2);const {createGame,serialize,deserialize,shiftWeather}=await import(pathToFileURL(path.resolve(source,'dist/sim.js')));
fs.mkdirSync(out,{recursive:true});
for(const [name,minute,kind] of [['day',720,'clear'],['night',1380,'clear'],['snow',720,'snow']]){
 const s=createGame('career',7182,{schedule:'ppa'});for(s.shift=1;s.shift<365&&shiftWeather(s).kind!==kind;s.shift++);if(shiftWeather(s).kind!==kind)throw Error('No weather fixture '+kind);
 s.population.elapsed=((minute-1020+1440)%1440)/.75;s.nextIncident=9000;const raw=serialize(s);deserialize(raw);
 fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({'meridian-watch-v1':raw}));
 console.log(name,shiftWeather(s));
}
