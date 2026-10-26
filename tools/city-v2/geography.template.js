import data from './city-data.js';
import {createNearestPoint} from './nearest-point.js';
import {containsWorldPoint,projectGeo} from './city-coverage.js';
import {roadSpeed} from './road-speed.js';
import {streetName,districtName} from './fiction.js';
export const MAP_ID='meridian-city-v2';
export const project=projectGeo;
export const point=n=>({x:n.x,y:n.y});
const graph=new Map();
// Claude 11.10 (owner: «машины едут не по дороге, заезжают»): routes follow travel time, and
// yards, parking aisles and driveways (OSM service) or living streets are only used to reach a
// place, not as shortcuts — like a real patrol car.
const ROUTE_PENALTY=Object.freeze({service:4,living_street:1.8,unclassified:1.15});
export const routeWeight=(d,speed,kind)=>{const kmh=typeof speed==='number'?speed:speed?.kmh;return d*(ROUTE_PENALTY[kind]??1)*50/Math.max(5,Number.isFinite(kmh)?kmh:30);};
for(const road of data.roads){if(!road.drive)continue;for(let k=0;k<road.nodes.length;k++){const [x,y]=road.p[k];if(!containsWorldPoint({x,y}))continue;const id=road.nodes[k];if(!graph.has(id))graph.set(id,{id,x,y,name:streetName(road.name),edges:[],reverse:[]});else if(road.name)graph.get(id).name=streetName(road.name);}
 for(let k=1;k<road.nodes.length;k++){const a=graph.get(road.nodes[k-1]),b=graph.get(road.nodes[k]);if(!a||!b)continue;const d=Math.hypot(a.x-b.x,a.y-b.y);const add=(u,v,forward)=>{const speed=roadSpeed(road,forward);u.edges.push({id:v.id,d,speed,w:routeWeight(d,speed,road.kind)});v.reverse.push(u.id);};if(road.oneway!=='-1')add(a,b,true);if(!['yes','1','true'].includes(road.oneway))add(b,a,false);}}
const closest=(p,list)=>list.reduce((a,b)=>Math.hypot(p.x-b.x,p.y-b.y)<Math.hypot(p.x-a.x,p.y-a.y)?b:a);
const initial=closest(project(24.499,58.384),[...graph.values()]);
function reachable(reverse=false){const seen=new Set([initial.id]),queue=[initial.id];for(let k=0;k<queue.length;k++){const n=graph.get(queue[k]);for(const id of reverse?n.reverse:n.edges.map(e=>e.id))if(!seen.has(id)){seen.add(id);queue.push(id);}}return seen;}
const out=reachable(),back=reachable(true);for(const id of graph.keys())if(!out.has(id)||!back.has(id))graph.delete(id);for(const n of graph.values())n.edges=n.edges.filter(e=>graph.has(e.id));
export const ROAD_NODES=[...graph.values()];
export const nearestRoad=createNearestPoint(ROAD_NODES);
const incoming=new Map();
for(const a of ROAD_NODES)for(const edge of a.edges){const b=graph.get(edge.id),key=b.x+','+b.y;const list=incoming.get(key)??[];list.push({a,b,edge});incoming.set(key,list);}
export function segmentSpeed(from,to){
 const matches=(incoming.get(to.x+','+to.y)??[]).filter(({a,b,edge})=>Math.abs(Math.hypot(from.x-a.x,from.y-a.y)+Math.hypot(from.x-b.x,from.y-b.y)-edge.d)<1e-7);
 return matches.sort((a,b)=>a.edge.speed.kmh-b.edge.speed.kmh)[0]?.edge.speed;
}

const anchors=data.districts;
export const NODES=anchors.map(([id,name,x,y,sector])=>({...point(nearestRoad({x:1.55+x/1670,y:2.52+y/1670})),id,name,sector}));
const names=new Set();for(const r of data.roads){if(!r.drive||!r.name||names.has(r.name))continue;const candidates=r.nodes.map(id=>graph.get(id)).filter(Boolean);if(!candidates.length)continue;names.add(r.name);const n=candidates[Math.floor(candidates.length/2)];NODES.push({...point(n),id:'street-'+r.id,name:streetName(r.name),kind:r.kind,sector:n.x<1.575?'west':'east'});}
export const byId=id=>NODES.find(n=>n.id===id);
export const nearest=p=>closest(p,NODES);
export const atNode=p=>ROAD_NODES.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<1e-7);
export const EDGES=ROAD_NODES.flatMap(n=>n.edges.map(e=>({a:n.id,b:e.id})));
class Heap{constructor(){this.q=[];}push(v){let k=this.q.length;this.q.push(v);while(k){const p=(k-1)>>1;if(this.q[p][0]<=v[0])break;this.q[k]=this.q[p];k=p;}this.q[k]=v;}pop(){const first=this.q[0],last=this.q.pop();if(this.q.length){let k=0;while(k*2+1<this.q.length){let c=k*2+1;if(c+1<this.q.length&&this.q[c+1][0]<this.q[c][0])c++;if(this.q[c][0]>=last[0])break;this.q[k]=this.q[c];k=c;}this.q[k]=last;}return first;}}
export function roadRoute(u,target){const start=nearestRoad(u.route?.length?u.route[0]:u),goal=nearestRoad(target),dist=new Map([[start.id,0]]),prev=new Map(),heap=new Heap();heap.push([0,start.id]);while(heap.q.length){const [d,id]=heap.pop();if(d!==dist.get(id))continue;if(id===goal.id)break;for(const e of graph.get(id).edges){const alt=d+e.w;if(alt<(dist.get(e.id)??Infinity)){dist.set(e.id,alt);prev.set(e.id,{id,speed:e.speed});heap.push([alt,e.id]);}}}const ids=[goal.id];while(ids[0]!==start.id){const id=prev.get(ids[0])?.id;if(!id)throw Error('Недостижимая улица');ids.unshift(id);}return ids.map((id,k)=>({...point(graph.get(id)),...(k?{roadSpeed:prev.get(id).speed}:u.route?.[0]?.roadSpeed?{roadSpeed:u.route[0].roadSpeed}:{})})).filter((p,k)=>k||Math.hypot(p.x-u.x,p.y-u.y)>1e-7);}
export function onRoad(p){return ROAD_NODES.some(a=>a.edges.some(e=>{const b=graph.get(e.id);return Math.abs(Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(p.x-b.x,p.y-b.y)-e.d)<1e-7;}));}
export function migrateMap(s){if(s.mapId===MAP_ID)return s;const oldMap=s.mapId;s.mapId=MAP_ID;const convert=p=>oldMap==='parnumaa-1'?project(p.x/3+23.55,58.85-p.y/5):p;for(const i of s.incidents)Object.assign(i,point(nearestRoad(convert(i))));for(const u of s.units){Object.assign(u,point(nearestRoad(convert(u))));u.route=[];const i=s.incidents.find(i=>i.id===u.incident);if(i){if(['working','decision'].includes(u.status))Object.assign(u,point(i));else u.route=roadRoute(u,i);}else if(u.status==='returning')u.route=roadRoute(u,byId('centre'));}return s;}
