// Native W1: scheduled road traffic. Presentation only; no saved state or simulation RNG.
import {byId,roadRoute} from './source/geography.js';
import {worldMinutes} from './source/transport.js';
import {MAP_METRES} from './source/world-scale.js';

export const LINES=[['vana','centre','mai'],['raama','centre','beach']];
const paths=[];
const mod=(n,d)=>(n%d+d)%d;
export function rushAt(minute){const m=mod(minute,1440);return m>=420&&m<540||m>=960&&m<1110;}
function build(index){
 const stops=[...LINES[Math.floor(index/2)]];if(index%2)stops.reverse();
 const legs=[];
 for(let k=1;k<stops.length;k++){
  const a=byId(stops[k-1]),b=byId(stops[k]);
  const points=[a,...roadRoute(a,b)],segments=[];
  for(let j=1;j<points.length;j++){
   const from=points[j-1],to=points[j],metres=Math.hypot(to.x-from.x,to.y-from.y)*MAP_METRES;
   if(metres<.01)continue;
   const centre=byId('centre'),central=Math.hypot((from.x+to.x)/2-centre.x,(from.y+to.y)/2-centre.y)*MAP_METRES<650;
   segments.push({from,to,metres,central,kmh:Math.min(32,to.roadSpeed?.kmh??30)});
  }
  legs.push(segments);
 }
 return {index,stops,legs};
}
// Build only one directional route per refresh. Never run pathfinding per vehicle/frame.
export function warmTraffic(){if(paths.length<4)paths.push(build(paths.length));return paths.length===4;}
const timelines=new Map();
function pose(path,age,departure,bus){
 if(age<0)return null;
 const peak=rushAt(departure),key=`${path.index}-${peak}-${bus}`;
 let timeline=timelines.get(key);
 if(!timeline){
  timeline=[];let end=0;
  for(const leg of path.legs){
   for(const s of leg){
    const kmh=Math.min(s.kmh,bus?28:32,peak&&s.central?12:Infinity);
    const start=end;end+=s.metres/kmh*60/1000;timeline.push({...s,start,end,stopped:false});
   }
   const s=leg.at(-1);
   if(bus&&s){const start=end;end+=25/60;timeline.push({...s,from:s.to,start,end,stopped:true});}
  }
  timelines.set(key,timeline);
 }
 if(!timeline.length||age>=timeline.at(-1).end)return null;
 let lo=0,hi=timeline.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(timeline[mid].end<=age)lo=mid+1;else hi=mid;}
 const s=timeline[lo],f=(age-s.start)/(s.end-s.start);
 const heading=s.stopped&&lo>0?Math.atan2(timeline[lo-1].to.y-timeline[lo-1].from.y,timeline[lo-1].to.x-timeline[lo-1].from.x):Math.atan2(s.to.y-s.from.y,s.to.x-s.from.x);
 return {x:s.from.x+(s.to.x-s.from.x)*f,y:s.from.y+(s.to.y-s.from.y)*f,heading,stopped:s.stopped};
}
export function trafficActors(elapsed,focus,radius){
 if(!focus||!Number.isFinite(elapsed)||!Number.isFinite(focus.x)||!Number.isFinite(focus.y))return [];
 const now=17*60+worldMinutes(elapsed),out=[];
 for(const path of paths){
  // Half-minute slots at peak, every third slot otherwise; empty streets at night.
  for(let slot=Math.floor(now*2);slot>=Math.floor((now-45)*2);slot--){
   const departure=slot/2+path.index*.07,m=mod(departure,1440);
   if(m<330||m>=1380||!rushAt(departure)&&mod(slot,3)!==0)continue;
   const p=pose(path,now-departure,departure,false);if(!p)continue;
   const d=Math.hypot(p.x-focus.x,p.y-focus.y);if(d>radius)continue;
   out.push({...p,id:`traffic-${path.index}-${slot}`,bus:false,d});
  }
  // Each route runs in both directions, 05:30–23:00, with a 10-minute headway.
  for(let slot=Math.floor(now/10);slot>=Math.floor((now-60)/10);slot--){
   const departure=slot*10+path.index*1.25,m=mod(departure,1440);
   if(m<330||m>=1380)continue;
   const p=pose(path,now-departure,departure,true);if(!p)continue;
   const d=Math.hypot(p.x-focus.x,p.y-focus.y);if(d>radius)continue;
   out.push({...p,id:`bus-${path.index}-${slot}`,bus:true,line:Math.floor(path.index/2)+1,d});
  }
 }
 // Buses first; reserve native slots for the player's units, services and residents.
 return [...out.filter(a=>a.bus).sort((a,b)=>a.d-b.d).slice(0,4),...out.filter(a=>!a.bus).sort((a,b)=>a.d-b.d).slice(0,24)];
}
