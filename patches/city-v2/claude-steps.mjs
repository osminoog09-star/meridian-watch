// Claude City 2.0 (22.10.2026): the looks of the new town — service buildings, wooden houses, panel blocks and works
// get their own architecture family (JS) and the native city mesh colours them by family: the police station with a blue
// band, the fire station in red brick, the hospital and the ambulance post white, panel blocks in light concrete.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const edit=(file,pairs)=>{let s=fs.readFileSync(file,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw Error(`${path.basename(file)}: anchor not found: ${a.slice(0,80)}`);s=s.replace(a,b);}fs.writeFileSync(file,s);};
export async function claudeSteps(js,native,city){
 // the tests of City V2 part 1 name the old grid's streets and points: the same checks on the new plan
 const t=n=>path.join(js,'tests',n);
 edit(t('geography.test.mjs'),[["r.name==='Ратушная улица'","r.name==='Ратушная площадь'"],["ROAD_NODES.length>3000","ROAD_NODES.length>2000"]]);
 edit(t('quarter.test.mjs'),[["assert.deepEqual(o.p,world([-39,-54]))","assert.deepEqual(o.p,world([0,0]))"]]);
 edit(t('living-city.test.mjs'),[['c={x:1.55+1500/1670,y:2.52-1680/1670},p={x:1.55+72/1670,y:2.52+504/1670}','c={x:1.55+120/1670,y:2.52-80/1670},p={x:1.55+48/1670,y:2.52+1264/1670}']]);
 const {default:data}=await import(pathToFileURL(path.join(js,'dist/city-data.js')));
 const hash=crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
 let dl=fs.readFileSync(t('city-data-loading.test.mjs'),'utf8');
 dl=dl.replace(/digest\('hex'\),'[0-9a-f]{64}'\)/,`digest('hex'),'${hash}')`).replace(/data\.buildings\.length,\d+\)/,`data.buildings.length,${data.buildings.length})`).replace(/data\.roads\.length,\d+\)/,`data.roads.length,${data.roads.length})`).replace(/data\.areas\.length,\d+\)/,`data.areas.length,${data.areas.length})`);
 if(!dl.includes(hash))throw Error('city-data-loading test');fs.writeFileSync(t('city-data-loading.test.mjs'),dl);
 const arch=path.join(js,'dist/architecture.js');
 edit(arch,[
  [" const family=['industrial','warehouse'].includes(b.kind)?'utility':['commercial','retail'].includes(b.kind)?'shop':b.h>=5?'block':'town';",
   " const SERVICE={police:'police',hospital:'clinic',ambulance:'clinic',fire_station:'fire',train_station:'civic',bus_station:'civic',civic:'civic',museum:'civic',school:'civic',church:'civic'};\n const family=SERVICE[b.kind]??(['industrial','warehouse'].includes(b.kind)?'utility':['commercial','retail'].includes(b.kind)?'shop':b.h>=5?'block':['house','detached'].includes(b.kind)?'house':'town');"],
  [" const walls={utility:['#a4aaa2','#abb1a8'],"," const walls={police:['#dfe4ea'],clinic:['#eeece6'],fire:['#a9503f'],civic:['#e4d5b1','#d9c9a6'],house:['#b8a27f','#8c6d4f','#c9b48e','#a7b7a3'],utility:['#a4aaa2','#abb1a8'],"],
  [" const roofs={utility:['#82918d','#a2b0a8'],"," const roofs={police:['#3c4a5c','#4c5a6c'],clinic:['#8d9496','#a5abad'],fire:['#5a3c34','#6e4a40'],civic:['#7d4a3a','#9a5d48'],house:['#9b6854','#c68b69'],utility:['#82918d','#a2b0a8'],"],
  ["flat:family!=='town',","flat:!['town','house','civic'].includes(family),"]]);
 for(const dir of ['simulation/source','ui/source'])fs.copyFileSync(arch,path.join(native,dir,'architecture.js'));
 // the landmarks of the new plan: the ambulance post gets its own sign (the detention block is behind the station, under its sign)
 const at=name=>{const c=city.civic.find(x=>x.name===name);if(!c)throw Error('civic '+name);return `x:1.55+${c.entrance[0]}/1670,y:2.52+${c.entrance[1]}/1670`;};
 edit(path.join(native,'ui/map-view.js'),[["{kind:'hospital',...HOSPITAL,label:'Больница'}];","{kind:'hospital',...HOSPITAL,label:'Больница'},{kind:'ems',"+at('Опорный пункт скорой помощи')+",label:'Скорая · опорный пункт'}];"],["label:'Префектура · ГБР'","label:'Пост ГБР префектуры'"]]);
 edit(path.join(native,'scripts/landmarks.gd'),[['"gbr":["1d2a44","Префектура · ГБР"],','"gbr":["1d2a44","Пост ГБР префектуры"],"ems":["f4f4f4","Скорая · опорный пункт"],"ivs":["5a7fc0","ИВС · задержанные"],']]);
 edit(path.join(native,'scripts/city_geometry.gd'),[
  [" if family==\"house\" or float(b.height)<8.0:\n  var wood := [\"b8a27f\",\"8c6d4f\",\"c9b48e\",\"a7b7a3\",\"b9483d\",\"d9d2c0\",\"7f8f9a\"]\n  wall = Color(wood[h%wood.size()])",
   " if family==\"house\" or float(b.height)<8.0:\n  var wood := [\"b8a27f\",\"8c6d4f\",\"c9b48e\",\"a7b7a3\",\"b9483d\",\"d9d2c0\",\"7f8f9a\"]\n  wall = Color(wood[h%wood.size()])\n # Claude City 2.0: services and building classes are recognisable from above\n var band := Color(0,0,0,0)\n match family:\n  \"police\":\n   wall = Color(\"dfe4ea\"); band = Color(\"2a4f8f\")\n  \"clinic\":\n   wall = Color(\"eeece6\"); band = Color(\"c23b32\")\n  \"fire\":\n   wall = Color(\"a9503f\"); band = Color(\"f0ece2\")\n  \"civic\":\n   wall = Color([\"e4d5b1\",\"d9c9a6\",\"e8dcc0\"][h%3])\n  \"block\":\n   wall = Color([\"d9d6cc\",\"cfd3d6\",\"e0d7c2\",\"c9d4d9\",\"d8cbb8\"][h%5])\n  \"utility\":\n   wall = Color([\"9aa0a0\",\"a8a39a\",\"8d969a\",\"b0a48c\"][h%4])"],
  ["  quad(st,base_a+normal*0.03+Vector3.UP*(height-0.35),base_d+normal*0.03+Vector3.UP*(height-0.35),base_d+normal*0.03+Vector3.UP*height,base_a+normal*0.03+Vector3.UP*height,wall.darkened(0.18),normal)",
   "  quad(st,base_a+normal*0.03+Vector3.UP*(height-0.35),base_d+normal*0.03+Vector3.UP*(height-0.35),base_d+normal*0.03+Vector3.UP*height,base_a+normal*0.03+Vector3.UP*height,wall.darkened(0.18),normal)\n  if band.a>0.0:\n   var lo := minf(3.1,height*0.55)\n   quad(st,base_a+normal*0.04+Vector3.UP*lo,base_d+normal*0.04+Vector3.UP*lo,base_d+normal*0.04+Vector3.UP*(lo+0.8),base_a+normal*0.04+Vector3.UP*(lo+0.8),band,normal)"]]);
}
