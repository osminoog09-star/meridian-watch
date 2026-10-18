import assert from 'node:assert/strict';
import {warmTraffic,trafficActors} from './street-traffic.js';
import {byId,onRoad} from './source/geography.js';
const focus=byId('centre'),elapsed=m=>(m+420)/.75;
for(let k=0;k<4;k++)warmTraffic();
let peak=0,quiet=0,stops=0;
for(let m=0;m<60;m+=2){
 const a=trafficActors(elapsed(480+m),focus,.35),b=trafficActors(elapsed(720+m),focus,.35);
 peak+=a.filter(v=>!v.bus).length;quiet+=b.filter(v=>!v.bus).length;
 assert(a.length<=28);assert(a.filter(v=>v.bus).length<=4);
 for(const v of a){assert(onRoad(v));assert(Number.isFinite(v.heading));}
 assert.deepEqual(a,trafficActors(elapsed(480+m),focus,.35),'paused time must not move vehicles');
}
assert(peak>quiet*1.5,'rush-hour traffic must visibly increase');
assert.equal(trafficActors(elapsed(120),focus,10).length,0,'night service ends');
for(let m=480;m<500;m+=.1)stops+=trafficActors(elapsed(m),focus,10).filter(v=>v.bus&&v.stopped).length;
assert(stops>0,'buses dwell at stops');
const before=trafficActors(elapsed(480),focus,.35);
trafficActors(elapsed(900),byId('mai'),.2);
assert.deepEqual(before,trafficActors(elapsed(480),focus,.35),'save reload/camera changes must preserve schedules');
assert.deepEqual(trafficActors(0,null,.35),[]);
console.log('W1 traffic: road geometry, density, stops, night schedule, determinism and limits PASS');
