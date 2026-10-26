import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generate,validate,write,DISTRICTS,BASES,LAYOUT_SCALE} from './generate.mjs';

test('authored city preserves every public district ID and every service base',()=>{
 const c=generate();assert.deepEqual(c.districts.map(d=>d[0]),['centre','ulejoe','raama','beach','mai','papiniidu','vana','raekula']);
 assert.equal(c.populationTarget,15000);assert.deepEqual(c.bases,BASES);assert.equal(validate(c).districts,8);
});
test('both directions connect every node, including district anchors and driveways',()=>{
 const c=generate(),result=validate(c);assert.ok(result.nodes>500);assert.equal(result.stronglyConnected,true);
 for(const d of DISTRICTS)assert.ok(c.roads.some(r=>r.p.some(p=>p[0]===d[2]&&p[1]===d[3])));
 assert.ok(c.roads.some(r=>r.kind==='service'));assert.ok(c.roads.some(r=>r.junction==='roundabout'));
});
test('only the two designed bridge corridors cross the river',()=>{
 const c=generate(),crossing=c.roads.filter(r=>Math.min(...r.p.map(p=>p[0]))<496*LAYOUT_SCALE&&Math.max(...r.p.map(p=>p[0]))>704*LAYOUT_SCALE);
 assert.equal(crossing.length,2);assert.deepEqual(crossing.map(r=>r.p[0][1]).sort((a,b)=>a-b),[-1200,720].map(v=>v*LAYOUT_SCALE));assert.ok(crossing.every(r=>r.bridge));
});
test('negative controls reject disconnected roads, off-road bases and building-road collisions',()=>{
 const c=generate();c.roads.push({id:'broken',nodes:['isolated-a','isolated-b'],p:[[9000,0],[9050,0]],width:6,oneway:'no'});assert.throws(()=>validate(c),/strongly connected/);
 const b=generate();b.bases={...b.bases,HQ:[12345,12345]};assert.throws(()=>validate(b),/HQ is off road/);
 const d=generate();d.buildings.push({id:'collision',p:[[-10,-10],[10,-10],[10,10],[-10,10]]});assert.throws(()=>validate(d),/collision overlaps/);
});
test('generation and exported JS/plan are byte deterministic and input independent',()=>{
 const a=generate(),b=generate();assert.deepEqual(a,b);const root=fs.mkdtempSync(path.join(os.tmpdir(),'meridian-city-'));
 try{write(a,path.join(root,'a'));write(b,path.join(root,'b'));for(const file of fs.readdirSync(path.join(root,'a')))assert.deepEqual(fs.readFileSync(path.join(root,'a',file)),fs.readFileSync(path.join(root,'b',file)));}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('sidewalks are outside carriageways and cross the river only on designed bridges',async()=>{
 const {walkingNetwork}=await import('./walking.mjs');const c=generate(),net=walkingNetwork(c,p=>p),roads=new Map(c.roads.map(r=>[r.id,r]));
 assert.ok(net.segments.some(s=>s.crossing));assert.ok(net.segments.some(s=>s.shared));
 for(const s of net.segments){
  if(s.roadId&&!s.shared){const r=roads.get(s.roadId),a=r.p[0],b=r.p.at(-1),p=s.p[0];const distance=Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]);assert.ok(distance>r.width/2+1,'sidewalk must clear carriageway');}
  const mid=[(s.p[0][0]+s.p[1][0])/2,(s.p[0][1]+s.p[1][1])/2];if(mid[0]>496*LAYOUT_SCALE&&mid[0]<704*LAYOUT_SCALE)assert.ok(s.bridge,'walking over river requires a bridge');
 }
});
