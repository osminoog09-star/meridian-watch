/** Experimental integration, deliberately separate from the released checkpoint. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {generate,write} from './generate.mjs';
const tools=path.dirname(fileURLToPath(import.meta.url));
const [jsArg,nativeArg]=process.argv.slice(2);
if(!jsArg||!nativeArg)throw Error('Usage: node tools/city-v2/prepare.mjs <clean JS 0.9.2 + through release-g1> <unpacked native-map>');
const js=path.resolve(jsArg),native=path.resolve(nativeArg);
const run=(command,args,cwd)=>{const r=spawnSync(command,args,{cwd,stdio:'inherit'});if(r.status!==0)throw Error(`${command} failed (${r.status})`);};
run('patch',['-p1','--dry-run','-i',path.join(tools,'runtime-wip.patch')],js);
run('patch',['-p1','-i',path.join(tools,'runtime-wip.patch')],js);
run('patch',['-p1','--dry-run','-i',path.join(tools,'native-wip.patch')],native);
run('patch',['-p1','-i',path.join(tools,'native-wip.patch')],native);
fs.copyFileSync(path.join(tools,'verify-country.gd'),path.join(native,'tools/verify_city_v2_country.gd'));
const city=generate();write(city,path.join(js,'dist'));
for(const directory of ['simulation/source','ui/source'])for(const name of ['city-data.js','geography.js','quarter-data.js','walking-network.js','fiction.js','visits.js','sim.js','city-v2-migration.js'])fs.copyFileSync(path.join(js,'dist',name),path.join(native,directory,name));
const {claudeSteps}=await import('./claude-steps.mjs');await claudeSteps(js,native,city);
run('node',[path.join(native,'export-map.mjs'),js,'--full-city'],native);
run('node',[path.join(native,'export-map.mjs'),js],native);
const {default:walking}=await import(pathToFileURL(path.join(js,'dist/walking-network.js')));
fs.writeFileSync(path.join(native,'assets/walking.json'),JSON.stringify(walking));
const exported=JSON.parse(fs.readFileSync(path.join(native,'assets/city.json'),'utf8'));
fs.writeFileSync(path.join(native,'assets/bridges.json'),JSON.stringify(exported.chunks.flatMap(c=>c.roads).filter(r=>r.bridge)));
fs.writeFileSync(path.join(native,'assets/landuse.json'),JSON.stringify(city.areas));
const landuse=path.join(native,'scripts/landuse.gd');fs.writeFileSync(landuse,fs.readFileSync(landuse,'utf8').replace('water_polygons.append(PackedVector2Array(SEA))','# City V2: the river is defined by assets/landuse.json.'));
// Claude City 2.0: the bases of the new plan in the runtime, the countryside meets the new exits and the river
{const w=p=>`{x:1.55+${p[0]}/1670,y:2.52+${p[1]}/1670}`;
 for(const dir of [path.join(js,'dist'),path.join(native,'simulation/source'),path.join(native,'ui/source')]){const f=path.join(dir,'sim.js');let s=fs.readFileSync(f,'utf8');
  s=s.replace(/export const HOSPITAL=Object\.freeze\(\{[^}]*\}\);/,`export const HOSPITAL=Object.freeze(${w(city.bases.HOSPITAL)});`).replace(/export const FIRE_STATION=Object\.freeze\(\{[^}]*\}\);/,`export const FIRE_STATION=Object.freeze(${w(city.bases.FIRE_STATION)});`).replace(/GBR_BASE=Object\.freeze\(\{[^}]*\}\)/,`GBR_BASE=Object.freeze(${w(city.bases.GBR_BASE)})`);
  fs.writeFileSync(f,s);}
 const V=p=>`Vector2(${p[0]},${p[1]})`,[N,Wx,E,S]=city.exits;
 const xs=city.exits.map(p=>p[0]),ys=city.exits.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys);
 const head=`const TOWN := Rect2(${x0},${y0},${Math.max(...xs)-x0},${Math.max(...ys)-y0})
const LAND_Y := -2.0
const Geometry = preload("res://scripts/city_geometry.gd")
# Claude City 2.0: the river beyond the town (simplified for placement checks); exits = where the town tracts end
const SEA = [${city.countrySea.map(V).join(',')}]
const CITY_EXITS = [${[N,Wx,E,S].map(V).join(',')}]
# Roads in world metres: the first point is where the town street ends (city data edge).
const ROADS := [
 {"width":10.0,"points":[${V(N)},Vector2(150,-3800),Vector2(-260,-5600),Vector2(-420,-7600),Vector2(-250,-10000),Vector2(150,-12500)]},
 {"width":7.0,"points":[${V(N)},Vector2(-600,-3000),Vector2(-2300,-5500),Vector2(-3300,-6900),Vector2(-5000,-8200),Vector2(-7200,-9800),Vector2(-9800,-11500)]},
 {"width":6.5,"points":[${V(Wx)},Vector2(-3150,-1500),Vector2(-3900,-2050),Vector2(-5200,-2400),Vector2(-7200,-2700),Vector2(-10500,-3300)]},
 {"width":7.0,"points":[${V(E)},Vector2(4200,400),Vector2(6900,850),Vector2(8200,800),Vector2(10000,1300),Vector2(12500,900)]},
 {"width":10.0,"points":[${V(S)},Vector2(2600,3200),Vector2(5250,4800),Vector2(5800,6300),Vector2(6400,8200),Vector2(7300,10500),Vector2(8200,12500)]},
`;
 const cf=path.join(native,'scripts/countryside.gd');let c=fs.readFileSync(cf,'utf8');const i0=c.indexOf('const TOWN :='),i1=c.indexOf(' {"width":5.5,');if(i0<0||i1<0)throw Error('countryside.gd layout changed');
 fs.writeFileSync(cf,c.slice(0,i0)+head+c.slice(i1));
 const lf=path.join(native,'scripts/landuse.gd');let l=fs.readFileSync(lf,'utf8');
 l=l.replace('var palette := {"square":"#aaa494",','var palette := {"railway":"#6f675e","square":"#aaa494",').replace('var layers := {"square":-0.5,','var layers := {"railway":-0.45,"square":-0.5,');if(!l.includes('"railway":"#6f675e"'))throw Error('landuse palette');fs.writeFileSync(lf,l);}
run('python3',[path.join(native,'tools/build_bridge_profiles.py')],native);
console.log('Experimental sources prepared. Rebuild bundles/manifests, verify ALL release gates before packing or publishing.');
