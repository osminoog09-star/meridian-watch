// Meridian — City 2.0 (Claude, 22.10.2026). Owner: «не сетка, а красивый и играбельный город на ~15 000 жителей».
// An authored, deterministic town plan in metres (x east, y south; the town hall square is near the origin):
// a curved river with embankments and three bridges; the historic centre — a square, radial streets and a ring
// boulevard; each district has its own street pattern: the wooden Old Posad (crooked lanes), the private sector
// (loops and dead ends), two panel micro-districts (superblocks with yard loops), the industrial zone along the railway,
// the pine-wood suburb (curved crescents) and the river park. Services stand on their own plots with entrances.
// The integration contract (roads/buildings/areas/districts/bases, write(), walking network) follows Codex's City V2
// part 1 so the runtime and native patches keep working.
import {walkingNetwork} from './walking.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const LAYOUT_SCALE=1;
export const ORIGIN=[1.55,2.52], SCALE=1670;
export const world=([x,y])=>[ORIGIN[0]+x/SCALE,ORIGIN[1]+y/SCALE];
const R=v=>Math.round(v*1e3)/1e3;
const P=p=>[R(p[0]),R(p[1])];
function prng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,k)=>[a[0]*k,a[1]*k],len=a=>Math.hypot(a[0],a[1]),norm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l];},perp=a=>[-a[1],a[0]],dist=(a,b)=>len(sub(a,b));
export function segDist(p,a,b){const d=sub(b,a),t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]*d[0]+d[1]*d[1]||1)));return dist(p,add(a,mul(d,t)));}
const closestOnSeg=(p,a,b)=>{const d=sub(b,a),t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]*d[0]+d[1]*d[1]||1)));return [add(a,mul(d,t)),t];};
function segInter(a,b,c,d){const r=sub(b,a),s=sub(d,c),den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)return null;const q=sub(c,a),t=(q[0]*s[1]-q[1]*s[0])/den,u=(q[0]*r[1]-q[1]*r[0])/den;if(t<=1e-6||t>=1-1e-6||u<=1e-6||u>=1-1e-6)return null;return {t,u,p:add(a,mul(r,t))};}
function segSegDist(a,b,c,d){if(segInter(a,b,c,d))return 0;return Math.min(segDist(a,c,d),segDist(b,c,d),segDist(c,a,b),segDist(d,a,b));}
// Catmull-Rom through control points, sampled every `step` metres
function spline(points,step=30){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];const n=Math.max(1,Math.ceil(dist(p1,p2)/step));for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;out.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}out.push(points.at(-1));return out;}
const resample=(line,step)=>{const out=[line[0]];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],n=Math.max(1,Math.ceil(dist(a,b)/step));for(let k=1;k<=n;k++)out.push(add(a,mul(sub(b,a),k/n)));}return out;};
// ---- the plan ----
export const SQUARE=[-260,20];
const RIVER_CTRL=[[-760,-2300],[-430,-1500],[-80,-980],[300,-520],[430,40],[330,620],[60,1120],[-120,1700],[-300,2400]];
export const RIVER=spline(RIVER_CTRL,25),RIVER_HALF=58;
// beyond the town the river turns west to the bay (north) and south-west (south): the countryside roads stay on their banks
export const RIVER_FAR=spline([[-12500,-5600],[-8000,-5300],[-5000,-5000],[-2600,-4300],[-1300,-3300],...RIVER_CTRL,[-500,3400],[-1300,5500],[-2600,8500],[-3500,12500]],40);
const riverDist=p=>{let m=Infinity;for(let i=1;i<RIVER.length;i++)m=Math.min(m,segDist(p,RIVER[i-1],RIVER[i]));return m;};
// which bank: sign of the cross product with the nearest river segment (+1 east, -1 west)
function bank(p){let m=Infinity,s=1;for(let i=1;i<RIVER.length;i++){const d=segDist(p,RIVER[i-1],RIVER[i]);if(d<m){m=d;const r=sub(RIVER[i],RIVER[i-1]),q=sub(p,RIVER[i-1]);s=Math.sign(r[0]*q[1]-r[1]*q[0])<0?1:-1;}}return s;}
export const DISTRICTS_PLAN=[
 // id, name, centre, bank, sector
 ['centre','Центр',SQUARE,-1,'west'],
 ['vana','Старый посад',[-820,-80],-1,'west'],
 ['raama','Северная слобода',[-780,-900],-1,'west'],
 ['beach','Речной парк',[-120,760],-1,'west'],
 ['ulejoe','Заречье',[860,-250],1,'east'],
 ['mai','Майский',[960,560],1,'east'],
 ['papiniidu','Промышленный',[820,-900],1,'east'],
 ['raekula','Сосновый бор',[620,1300],1,'east']
];
const TOWN_R=1400;
function districtOf(p){if(dist(p,SQUARE)<380&&bank(p)<0)return 'centre';const b=bank(p);let best=null,m=Infinity;for(const [id,,c,side] of DISTRICTS_PLAN){if(side!==b)continue;let d=dist(p,c);if(id==='centre')d+=260;if(d<m){m=d;best=id;}}return best;}
const insideTown=p=>{const a=Math.atan2(p[1]-60,p[0]-180);return dist(p,[180,60])<TOWN_R*(0.92+0.08*Math.sin(a*3+1.2));};
const RAIL=spline([[-1900,-1180],[-900,-1020],[-260,-760],[400,-860],[1100,-1060],[2000,-1180]],30);
const railDist=p=>{let m=Infinity;for(let i=1;i<RAIL.length;i++)m=Math.min(m,segDist(p,RAIL[i-1],RAIL[i]));return m;};
export const STATION=[-260,-735];
export function generate(){
 const rnd=prng(2026);
 const streets=[];// {pts,kind,name,bridge,oneway,junction}
 const S=(pts,kind,name,extra={})=>{streets.push({pts:pts.map(P),kind,name,...extra});};
 const WIDTH={primary:9,secondary:8,residential:6,service:4,living_street:4.5};
 // ---- river embankments and bridges ----
 const shore=(side,off)=>RIVER.map((p,i)=>{const a=RIVER[Math.max(0,i-1)],b=RIVER[Math.min(RIVER.length-1,i+1)];return add(p,mul(norm(perp(sub(b,a))),side*off));});
 const westEmb=shore(1,RIVER_HALF+22).filter(insideTown),eastEmb=shore(-1,RIVER_HALF+22).filter(insideTown);
 S(westEmb,'secondary','Береговая улица');S(eastEmb,'secondary','Заречная набережная');
 // bridges: perpendicular crossings at three points along the river
 const bridgeAt=(idx,name,kind='primary')=>{const p=RIVER[idx],a=RIVER[idx-1],b=RIVER[idx+1],n=norm(perp(sub(b,a)));S([add(p,mul(n,RIVER_HALF+22)),add(p,mul(n,-(RIVER_HALF+22)))],kind,name,{bridge:true});return [add(p,mul(n,RIVER_HALF+22)),add(p,mul(n,-(RIVER_HALF+22)))];};
 const nearestRiverIdx=y=>{let best=0,m=Infinity;RIVER.forEach((p,i)=>{if(i>0&&i<RIVER.length-1&&Math.abs(p[1]-y)<m){m=Math.abs(p[1]-y);best=i;}});return best;};
 const bOld=bridgeAt(nearestRiverIdx(30),'Старый мост');
 const bNorth=bridgeAt(nearestRiverIdx(-640),'Северный мост','secondary');
 const bSouth=bridgeAt(nearestRiverIdx(760),'Южный мост','secondary');
 // ---- historic centre: square, radial streets, inner and outer rings ----
 const sq=SQUARE,sqHalf=[62,42];
 const sqRing=[[sq[0]-sqHalf[0],sq[1]-sqHalf[1]],[sq[0]+sqHalf[0],sq[1]-sqHalf[1]],[sq[0]+sqHalf[0],sq[1]+sqHalf[1]],[sq[0]-sqHalf[0],sq[1]+sqHalf[1]]];
 S([...sqRing,sqRing[0]],'living_street','Ратушная площадь');
 const ring=(r,a0,a1,step)=>{const pts=[];for(let a=a0;a<=a1+1e-9;a+=step)pts.push([sq[0]+Math.cos(a)*r*(1+.05*Math.sin(a*3)),sq[1]+Math.sin(a)*r*(1+.05*Math.cos(a*2))]);return pts;};
 const westOnly=p=>bank(p)<0&&riverDist(p)>RIVER_HALF+30;
 const keepRuns=(pts,ok)=>{const runs=[];let cur=[];for(const p of pts){if(ok(p))cur.push(p);else{if(cur.length>1)runs.push(cur);cur=[];}}if(cur.length>1)runs.push(cur);return runs;};
 for(const run of keepRuns(ring(190,0,Math.PI*2,Math.PI/24),westOnly))S(run,'residential','Малое кольцо');
 for(const run of keepRuns(ring(400,0,Math.PI*2,Math.PI/30),westOnly))S(run,'secondary','Бульварное кольцо');
 const RADIALS=[['Торговая улица',-Math.PI/2-0.25],['Вокзальная улица',-Math.PI/2+0.35],['Школьная улица',Math.PI/2-0.2],['Музейная улица',Math.PI+0.6],['Садовая улица',Math.PI/2+0.75],['Посадская улица',Math.PI-0.55]];
 for(const [name,a] of RADIALS){const start=[sq[0]+Math.cos(a)*Math.min(sqHalf[0]/Math.abs(Math.cos(a)||1e-9),sqHalf[1]/Math.abs(Math.sin(a)||1e-9)),sq[1]+Math.sin(a)*Math.min(sqHalf[0]/Math.abs(Math.cos(a)||1e-9),sqHalf[1]/Math.abs(Math.sin(a)||1e-9))];
  const ctrl=[start];for(const r of [160,330,520,760]){const bend=Math.sin(r/170+a*2)*0.09;ctrl.push([sq[0]+Math.cos(a+bend)*r,sq[1]+Math.sin(a+bend)*r]);}
  for(const run of keepRuns(spline(ctrl,30),p=>westOnly(p)&&insideTown(p)))S(run,name==='Мостовая улица'?'primary':'secondary',name);}
 // the main street: west exit → square; old bridge → east exit
 S(spline([[-1560,10],[-1200,-30],[-800,10],[-480,25],[sq[0]-sqHalf[0],sq[1]]],30),'primary','Главная улица');
 S(spline([bOld[1],[700,10],[1100,-40],[1640,-60]],30),'primary','Восточное шоссе');
 S(spline([[sq[0]+sqHalf[0],sq[1]],[0,25],[150,30],bOld[0]],30),'primary','Мостовая улица');
 // the north tract (to the capital) and the south tract (along the coast)
 S(spline([bNorth[1],[150,-1000],[230,-1450]],30),'primary','Северный тракт');
 S(spline([bSouth[1],[640,900],[900,1300],[1080,1760]],30),'primary','Южный тракт');
 S(spline([bNorth[1],[620,-760],[980,-820],[1500,-760]],30),'secondary','Заводская улица');
 S(spline([bNorth[0],[-60,-720],STATION],30),'secondary','Привокзальная улица');
 // ---- district fabrics ----
 // jittered lattice → organic streets; keep edges inside the district, away from the river and the railway
 const lattice=(id,origin,step,angle,jitter,keep,kind,names,curve=0.25,maxR=1e9)=>{
  const c=Math.cos(angle),s=Math.sin(angle),pts=new Map();
  for(let i=-16;i<=16;i++)for(let j=-16;j<=16;j++){const lx=i*step+(rnd()-.5)*jitter,ly=j*step+(rnd()-.5)*jitter,p=[origin[0]+lx*c-ly*s,origin[1]+lx*s+ly*c];if(insideTown(p)&&dist(p,origin)<=maxR&&districtOf(p)===id&&riverDist(p)>RIVER_HALF+40&&railDist(p)>28&&dist(p,SQUARE)>430)pts.set(i+','+j,p);}
  let n=0;for(const [k,p] of pts){const [i,j]=k.split(',').map(Number);for(const [di,dj] of [[1,0],[0,1]]){const q=pts.get((i+di)+','+(j+dj));if(!q||rnd()>keep)continue;
   const mid=add(mul(add(p,q),.5),mul(norm(perp(sub(q,p))),(rnd()-.5)*step*curve));const line=spline([p,mid,q],25);
   if(line.some(x=>riverDist(x)<RIVER_HALF+30||railDist(x)<20))continue;S(line,kind,names[(n++)%names.length]);}}};
 lattice('vana',[-820,-80],88,0.22,34,0.88,'living_street',['Липовая','Гончарная','Рыбацкая','Церковная','Льняная','Овражная','Тихая','Ремесленная'].map(x=>x+' улица'),0.45);
 lattice('raama',[-760,-900],118,-0.12,40,0.68,'residential',['Яблоневая','Сиреневая','Полевая','Ольховая','Клеверная','Ручейная','Луговая'].map(x=>x+' улица'),0.5);
 lattice('ulejoe',[860,-250],210,0.26,0,1,'secondary',['Лесная','Строителей','Молодёжная','Парковая'].map(x=>x+' улица'),0.05,560);
 lattice('mai',[960,560],200,-0.18,0,1,'secondary',['Майская','Весенняя','Солнечная','Звёздная'].map(x=>x+' улица'),0.05,520);
 lattice('papiniidu',[820,-900],170,-0.12,12,0.85,'secondary',['Складская','Заводская','Деповская','Цеховая'].map(x=>x+' улица'),0.03);
 lattice('beach',[-120,760],130,0.4,30,0.35,'residential',['Прибрежная','Парковая аллея'].map(x=>x),0.3);
 // the pine-wood suburb: crescents around a centre and radial lanes
 const bor=[620,1300];for(const r of [140,230,320,410]){const pts=[];for(let a=-2.6;a<=0.4;a+=0.08)pts.push([bor[0]+Math.cos(a)*r,bor[1]+Math.sin(a)*r]);for(const run of keepRuns(pts,p=>insideTown(p)&&bank(p)>0&&riverDist(p)>RIVER_HALF+40))S(run,'residential',['Сосновая','Хвойная','Вересковая','Брусничная'][Math.round((r-140)/90)]+' улица');}
 for(let a=-2.5;a<=0.3;a+=0.55){const pts=[];for(let r=60;r<=470;r+=30)pts.push([bor[0]+Math.cos(a)*r,bor[1]+Math.sin(a)*r]);for(const run of keepRuns(pts,p=>insideTown(p)&&bank(p)>0&&riverDist(p)>RIVER_HALF+40))S(run,'residential','Боровой проезд');}
 // panel superblocks: a service loop inside every block of the lattice
 const loops=[];
 const RESERVED=[[760,140],[700,-30],[1000,700],[980,160]];
 for(const [id,o,step,ang] of [['ulejoe',[860,-250],210,0.26],['mai',[960,560],200,-0.18]]){const c=Math.cos(ang),s=Math.sin(ang);
  for(let i=-6;i<6;i++)for(let j=-6;j<6;j++){const cx=(i+.5)*step,cy=(j+.5)*step,ctr=[o[0]+cx*c-cy*s,o[1]+cx*s+cy*c];if(!insideTown(ctr)||districtOf(ctr)!==id||riverDist(ctr)<RIVER_HALF+140||dist(ctr,o)>520||RESERVED.some(q=>dist(q,ctr)<step*.6)||rnd()<.15)continue;
   const h=step/2-38,corner=(x,y)=>[ctr[0]+x*c-y*s,ctr[1]+x*s+y*c];const box=[corner(-h,-h),corner(h,-h),corner(h,h),corner(-h,h)];
   S([...box,box[0]],'service','Дворовой проезд');S([corner(0,h),corner(0,step/2)],'service','Дворовой проезд');loops.push({id,ctr,c,s,h,step});}}
 // ---- road graph: split every street where it meets another; one road record per piece ----
 const segs=[];streets.forEach((st,si)=>{const pts=resample(st.pts,40);for(let i=1;i<pts.length;i++)segs.push({a:pts[i-1],b:pts[i],si});});
 const cuts=segs.map(()=>[]);const cell=80,grid=new Map();const key=(x,y)=>x+','+y;
 segs.forEach((g,k)=>{const x0=Math.floor(Math.min(g.a[0],g.b[0])/cell),x1=Math.floor(Math.max(g.a[0],g.b[0])/cell),y0=Math.floor(Math.min(g.a[1],g.b[1])/cell),y1=Math.floor(Math.max(g.a[1],g.b[1])/cell);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const kk=key(x,y);if(!grid.has(kk))grid.set(kk,[]);grid.get(kk).push(k);}});
 const near=(p,r)=>{const out=new Set();for(let x=Math.floor((p[0]-r)/cell);x<=Math.floor((p[0]+r)/cell);x++)for(let y=Math.floor((p[1]-r)/cell);y<=Math.floor((p[1]+r)/cell);y++)for(const k of grid.get(key(x,y))??[])out.add(k);return out;};
 for(const cellList of grid.values())for(let i=0;i<cellList.length;i++)for(let j=i+1;j<cellList.length;j++){const A=segs[cellList[i]],B=segs[cellList[j]];if(A.si===B.si)continue;const bridgeA=streets[A.si].bridge,bridgeB=streets[B.si].bridge;if(bridgeA!==bridgeB&&(bridgeA||bridgeB))continue;const x=segInter(A.a,A.b,B.a,B.b);if(!x)continue;const p=P(x.p);cuts[cellList[i]].push([x.t,p]);cuts[cellList[j]].push([x.u,p]);}
 // T-junctions: a street end close to another street joins it
 const ends=[];streets.forEach((st,si)=>{for(const p of [st.pts[0],st.pts.at(-1)])ends.push([si,p]);});
 const snaps=new Map();
 for(const [si,p] of ends){let best=null,m=14;for(const k of near(p,20)){const g=segs[k];if(g.si===si)continue;if(streets[g.si].bridge!==streets[si].bridge&&(streets[g.si].bridge||streets[si].bridge))continue;const [q,t]=closestOnSeg(p,g.a,g.b),d=dist(p,q);if(d<m&&d>1e-6){m=d;best=[k,t,P(q)];}}if(best){cuts[best[0]].push([best[1],best[2]]);snaps.set(si+':'+p.join(','),best[2]);}}
 const roads=[],nodes=new Map(),node=p=>{const k=P(p).join(',');if(!nodes.has(k))nodes.set(k,'v2-'+k);return nodes.get(k);};
 streets.forEach((st,si)=>{let pts=[];const mine=segs.map((g,k)=>[g,k]).filter(([g])=>g.si===si);mine.forEach(([g,k],n)=>{if(n===0){const s0=snaps.get(si+':'+st.pts[0].join(','));pts.push(s0??P(g.a));}const c=cuts[k].sort((a,b)=>a[0]-b[0]);for(const [,p] of c)pts.push(p);const last=n===mine.length-1;const s1=last?snaps.get(si+':'+st.pts.at(-1).join(',')):null;pts.push(s1??P(g.b));});
  pts=pts.filter((p,i)=>i===0||dist(p,pts[i-1])>0.5);if(pts.length<2)return;
  const w=st.name==='Ратушная площадь'?7:WIDTH[st.kind],speed=st.kind==='primary'?50:st.kind==='secondary'?40:st.kind==='service'?10:st.kind==='living_street'?20:30;
  roads.push({id:'v2-road-'+roads.length,p:pts,nodes:pts.map(node),kind:st.kind,name:st.name,drive:true,bridge:!!st.bridge,oneway:st.oneway??'no',width:w,speedTags:{maxspeed:String(speed)},...(st.junction?{junction:st.junction}:{})});});
 // exits beyond the town (for the countryside roads of G5)
 const EXITS=[['Северный тракт',[230,-1450],[300,-2750]],['Западный тракт',[-1560,10],[-1900,40]],['Восточный тракт',[1640,-60],[2000,-80]],['Южный тракт',[1080,1760],[1200,2150]]];
 for(const [name,a,b] of EXITS){const pa=P(a);roads.push({id:'v2-road-'+roads.length,p:[pa,P(b)],nodes:[node(pa),node(P(b))],kind:'primary',name,drive:true,bridge:false,oneway:'no',width:9,speedTags:{maxspeed:'70'}});}
 // ---- keep the strongly connected network; connect stray pieces to it ----
 const keepConnected=()=>{const g=new Map();for(const r of roads)for(let i=1;i<r.nodes.length;i++){const a=r.nodes[i-1],b=r.nodes[i];if(!g.has(a))g.set(a,new Set());if(!g.has(b))g.set(b,new Set());g.get(a).add(b);if(r.oneway!=='yes')g.get(b).add(a);}
  const start=node(P(sq.map((v,i)=>i?sq[1]+sqHalf[1]:sq[0]-sqHalf[0])));const bfs=(rev)=>{const seen=new Set([start]),q=[start];const gg=new Map();for(const [a,es] of g)for(const b of es){const [u,v]=rev?[b,a]:[a,b];if(!gg.has(u))gg.set(u,[]);gg.get(u).push(v);}for(let i=0;i<q.length;i++)for(const v of gg.get(q[i])??[])if(!seen.has(v)){seen.add(v);q.push(v);}return seen;};
  const f=bfs(false),b=bfs(true);return new Set([...f].filter(x=>b.has(x)));};
 let good=keepConnected();
 for(let pass=0;pass<3;pass++){const stray=roads.filter(r=>!r.nodes.every(n=>good.has(n)));if(!stray.length)break;
  const goodPts=[...nodes].filter(([,id])=>good.has(id)).map(([k])=>k.split(',').map(Number));
  for(const r of stray){if(r.nodes.some(n=>good.has(n)))continue;let best=null,m=120;for(const p of [r.p[0],r.p.at(-1)])for(const q of goodPts){const d=dist(p,q);if(d<m&&d>1&&riverDist(add(p,mul(sub(q,p),.5)))>RIVER_HALF+10&&bank(p)===bank(q)){m=d;best=[p,q];}}
   if(best){const [a,b]=best;roads.push({id:'v2-road-'+roads.length,p:[a,b],nodes:[node(a),node(b)],kind:r.kind==='service'?'service':'residential',name:r.name,drive:true,bridge:false,oneway:'no',width:r.kind==='service'?4:6,speedTags:{maxspeed:'30'}});}}
  good=keepConnected();}
 for(let i=roads.length-1;i>=0;i--){const r=roads[i];const ok=r.nodes.filter(n=>good.has(n)).length;if(ok<r.nodes.length){// trim to the connected run or drop
   const keep=[];for(let k=0;k<r.nodes.length;k++)if(good.has(r.nodes[k]))keep.push(k);const runs=[];let cur=[];for(const k of keep){if(cur.length&&k!==cur.at(-1)+1){runs.push(cur);cur=[];}cur.push(k);}if(cur.length)runs.push(cur);
   roads.splice(i,1);for(const run of runs)if(run.length>1)roads.push({...r,id:r.id+'-'+run[0],p:run.map(k=>r.p[k]),nodes:run.map(k=>r.nodes[k])});}}
 roads.forEach((r,i)=>r.id='v2-road-'+i);
 // ---- areas ----
 const areas=[];
 const far=(side,off)=>RIVER_FAR.map((p,i)=>{const a=RIVER_FAR[Math.max(0,i-1)],b=RIVER_FAR[Math.min(RIVER_FAR.length-1,i+1)];return add(p,mul(norm(perp(sub(b,a))),side*off));});
 const riverPoly=[...far(1,RIVER_HALF),...far(-1,RIVER_HALF).reverse()].map(P);areas.push({kind:'water',p:riverPoly});
 // riverside parks along both banks of the beach district and a green belt on the embankment
 const parkWest=shore(1,RIVER_HALF+14).filter((p,i)=>p[1]>350&&p[1]<1350),parkWest2=shore(1,RIVER_HALF+240).filter((p,i)=>p[1]>350&&p[1]<1350);
 const parks=[];if(parkWest.length>2){const pk=[...parkWest,...parkWest2.reverse()].map(P);parks.push(pk);areas.push({kind:'park',p:pk});}
 areas.push({kind:'square',p:sqRing.map(P)});
 for(const l of loops){const h=l.h-8,corner=(x,y)=>[l.ctr[0]+x*l.c-y*l.s,l.ctr[1]+x*l.s+y*l.c];areas.push({kind:'grass',p:[corner(-h,-h),corner(h,-h),corner(h,h),corner(-h,h)].map(P)});}
 // the railway as a gravel strip, the industrial yards, pine woods
 const railPoly=[...RAIL.map((p,i)=>{const a=RAIL[Math.max(0,i-1)],b=RAIL[Math.min(RAIL.length-1,i+1)];return add(p,mul(norm(perp(sub(b,a))),5));}),...RAIL.map((p,i)=>{const a=RAIL[Math.max(0,i-1)],b=RAIL[Math.min(RAIL.length-1,i+1)];return add(p,mul(norm(perp(sub(b,a))),-5));}).reverse()];
 areas.push({kind:'railway',p:railPoly.map(P)});
 for(const c of [[620,1300],[300,1520],[860,1560],[-900,-1350],[-1150,600]]){const pts=[];for(let a=0;a<Math.PI*2;a+=Math.PI/8)pts.push(P([c[0]+Math.cos(a)*(70+20*Math.sin(a*3)),c[1]+Math.sin(a)*(60+15*Math.cos(a*2))]));areas.push({kind:'forest',p:pts});}
 // ---- buildings along the streets, in the style of each district ----
 const buildings=[],bgrid=new Map(),rgrid=new Map(),rc=60;
 const rkey=(x,y)=>x+','+y;
 for(const r of roads)for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i];for(let x=Math.floor((Math.min(a[0],b[0])-12)/rc);x<=Math.floor((Math.max(a[0],b[0])+12)/rc);x++)for(let y=Math.floor((Math.min(a[1],b[1])-12)/rc);y<=Math.floor((Math.max(a[1],b[1])+12)/rc);y++){const k=rkey(x,y);if(!rgrid.has(k))rgrid.set(k,[]);rgrid.get(k).push([a,b,r.width]);}}
 const clearRoads=(poly,extra=2.8)=>{const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);for(let x=Math.floor((Math.min(...xs)-12)/rc);x<=Math.floor((Math.max(...xs)+12)/rc);x++)for(let y=Math.floor((Math.min(...ys)-12)/rc);y<=Math.floor((Math.max(...ys)+12)/rc);y++)for(const [a,b,w] of rgrid.get(rkey(x,y))??[]){for(let i=0;i<poly.length;i++)if(segSegDist(poly[i],poly[(i+1)%poly.length],a,b)<w/2+extra)return false;if(insidePoly(a,poly))return false;}return true;};
 const insidePoly=(p,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
 const overlapsBuilding=poly=>{const ctr=mul(poly.reduce((s,p)=>add(s,p),[0,0]),1/poly.length),rad=Math.max(...poly.map(p=>dist(p,ctr)));for(let x=Math.floor((ctr[0]-80)/rc);x<=Math.floor((ctr[0]+80)/rc);x++)for(let y=Math.floor((ctr[1]-80)/rc);y<=Math.floor((ctr[1]+80)/rc);y++)for(const o of bgrid.get(rkey(x,y))??[]){if(dist(o.ctr,ctr)>o.rad+rad+1)continue;if(polysOverlap(o.poly,poly))return true;}return false;};
 const polysOverlap=(A,B)=>{for(const poly of [A,B])for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ax=[-(b[1]-a[1]),b[0]-a[0]];const pa=A.map(p=>p[0]*ax[0]+p[1]*ax[1]),pb=B.map(p=>p[0]*ax[0]+p[1]*ax[1]);if(Math.max(...pa)<Math.min(...pb)-1.5||Math.max(...pb)<Math.min(...pa)-1.5)return false;}return true;};
 const place=(poly,floors,kind,d,name='',outside=false)=>{if(!name&&parks.some(pk=>poly.some(p=>insidePoly(p,pk))))return false;if(poly.some(p=>!(outside||insideTown(p))||riverDist(p)<RIVER_HALF+8||railDist(p)<(name==='Железнодорожный вокзал'?7:12)))return false;if(!clearRoads(poly))return false;if(overlapsBuilding(poly))return false;
  const ctr=mul(poly.reduce((s,p)=>add(s,p),[0,0]),1/poly.length),rad=Math.max(...poly.map(p=>dist(p,ctr)));const k=rkey(Math.floor(ctr[0]/rc),Math.floor(ctr[1]/rc));if(!bgrid.has(k))bgrid.set(k,[]);bgrid.get(k).push({poly,ctr,rad});
  buildings.push({id:'v2-building-'+buildings.length,p:poly.map(P),h:floors,kind,district:d,name});return true;};
 const rect=(c,dir,w,dpt)=>{const u=norm(dir),v=perp(u);return [add(add(c,mul(u,-w/2)),mul(v,-dpt/2)),add(add(c,mul(u,w/2)),mul(v,-dpt/2)),add(add(c,mul(u,w/2)),mul(v,dpt/2)),add(add(c,mul(u,-w/2)),mul(v,dpt/2))];};
 // the civic plots first, so the houses fill around them
 const civic=[];
 {const g=[[sq[0]-sqHalf[0]-4,sq[1]-sqHalf[1]-4],[sq[0]+sqHalf[0]+4,sq[1]-sqHalf[1]-4],[sq[0]+sqHalf[0]+4,sq[1]+sqHalf[1]+4],[sq[0]-sqHalf[0]-4,sq[1]+sqHalf[1]+4]],ctr=sq,rad=90;const k=rkey(Math.floor(ctr[0]/rc),Math.floor(ctr[1]/rc));if(!bgrid.has(k))bgrid.set(k,[]);bgrid.get(k).push({poly:g,ctr,rad});}
 const frontage=(want,kinds,w,dpt,floors,kind,name,opt={})=>{for(const wnt of typeof want[0]==='number'?[want]:want){const e=frontage1(wnt,kinds,w,dpt,floors,kind,name,opt);if(e)return e;}return null;};
 const frontage1=(want,kinds,w,dpt,floors,kind,name,{d=null,setback=4,bothSides=true,outside=false}={})=>{let best=null;
  for(const r of roads){if(!kinds.includes(r.kind)||r.bridge)continue;for(let i=1;i<r.p.length;i++){const [q]=closestOnSeg(want,r.p[i-1],r.p[i]);const dd=dist(q,want);if(dd<(best?.dd??260))best={dd,r,i,q};}}
  if(!best)return null;const {r,i}=best,a=r.p[i-1],b=r.p[i],dir=norm(sub(b,a)),n=perp(dir);
  for(const shift of [0,12,-12,24,-24,36,-36,50,-50])for(const side of bothSides?[1,-1]:[1]){const base=add(best.q,mul(dir,shift));const [onRoad]=closestOnSeg(base,a,b);const c=add(onRoad,mul(n,side*(r.width/2+setback+dpt/2+2.8)));const poly=rect(c,dir,w,dpt);
   if(place(poly,floors,kind,d??districtOf(c),name,outside)){const e=P(onRoad);if(dist(e,a)>0.5&&dist(e,b)>0.5){r.p.splice(i,0,e);r.nodes.splice(i,0,node(e));}civic.push({name,kind,entrance:e,poly});return e;}}
  return null;};
 const BASES={};
 // the police station faces the town-hall square (its door is the town's centre anchor); behind it, across its yard,
 // the detention block (ИВС): the duty desk, the patrol room, district officers and the investigator are in the main building
 BASES.HQ=frontage([[sq[0]+30,sq[1]+sqHalf[1]+10],[sq[0]-30,sq[1]+sqHalf[1]+10],[sq[0]+sqHalf[0]+10,sq[1]+18],[sq[0]+30,sq[1]-sqHalf[1]-10],[sq[0]-30,sq[1]-sqHalf[1]-10],[sq[0]-sqHalf[0]-10,sq[1]-18]],['living_street'],34,22,3,'police','Полицейский участок',{setback:6});
 {const hq=civic.at(-1),u=norm(sub(hq.poly[1],hq.poly[0])),v=norm(sub(hq.poly[3],hq.poly[0])),c=mul(hq.poly.reduce((a,p)=>add(a,p),[0,0]),.25);
  const away=dist(add(c,v),hq.entrance)>dist(c,hq.entrance)?v:mul(v,-1);
  for(const [back,slide] of [[22,0],[26,0],[22,8],[22,-8],[30,0],[26,12],[26,-12],[34,0]])if(place(rect(add(add(c,mul(away,back)),mul(u,slide)),u,18,12),1,'police','',false)){buildings.at(-1).name='Изолятор временного содержания';civic.push({name:'Изолятор временного содержания',kind:'police',entrance:hq.entrance,poly:buildings.at(-1).p});break;}}
 BASES.HOSPITAL=frontage([[760,140],[620,160],[980,-120],[700,330],[1100,150]],['secondary','primary','residential'],72,36,4,'hospital','Больница',{setback:14});
 BASES.AMBULANCE=frontage([[700,-30],[640,60],[900,0]],['secondary','primary'],34,20,1,'ambulance','Опорный пункт скорой помощи',{setback:10});
 BASES.FIRE_STATION=frontage([-430,-420],['primary','secondary'],40,26,2,'fire_station','Пожарная часть',{setback:10});
 // the prefecture's rapid response team is not the town's: it comes from its post on the northern tract, out of town
 BASES.GBR_BASE=frontage([[290,-2550],[280,-2450]],['primary'],44,26,2,'police','Пост ГБР префектуры',{setback:10,outside:true});
 frontage([sq[0],sq[1]-110],['secondary','residential','living_street'],52,24,3,'civic','Ратуша',{setback:4});
 frontage([sq[0]-130,sq[1]-70],['secondary','residential','living_street'],34,20,2,'museum','Городской музей',{setback:4});
 frontage([sq[0]+150,sq[1]-60],['secondary','residential','primary'],40,18,1,'bus_station','Автовокзал',{setback:6});
 frontage([[STATION[0],STATION[1]+10],[STATION[0]+60,STATION[1]],[STATION[0]-60,STATION[1]+20],[STATION[0]+120,STATION[1]-10],[-120,-700]],['secondary','primary','residential'],40,14,2,'train_station','Железнодорожный вокзал',{setback:4});
 frontage([sq[0]-60,sq[1]+150],['secondary','residential'],38,26,3,'school','Школа',{setback:10});
 frontage([sq[0]-180,sq[1]+40],['secondary','residential','living_street'],20,30,4,'church','Церковь',{setback:8});
 frontage([sq[0]+110,sq[1]+60],['primary','secondary'],22,14,2,'commercial','Бар «Мост»',{setback:3});
 frontage([sq[0]+20,sq[1]+90],['secondary','residential','living_street'],44,18,2,'retail','Рынок',{setback:5});
 frontage([1000,700],['secondary'],60,30,2,'retail','Торговый центр «Майский»',{setback:16});
 frontage([[1150,-1000],[900,-1150],[1250,-850],[700,-1050]],['secondary','residential'],50,30,2,'industrial','Лесопильный завод',{setback:10});
 frontage([500,-900],['secondary'],40,22,1,'industrial','Депо',{setback:10});
 frontage([[1300,-60],[1450,-60],[1200,-50],[1300,-600]],['primary','secondary'],22,12,1,'retail','АЗС',{setback:8});
 frontage([[980,160],[1100,300],[900,-300],[1200,700],[1050,-50]],['secondary','service','residential'],40,22,3,'school','Школа «Заречье»',{setback:10});
 for(const k of Object.keys(BASES))if(!BASES[k]){if(process.env.CITY_DEBUG)console.error('base not placed: '+k);else throw Error('base not placed: '+k);}
 // district lots
 const STYLE={
  centre:{w:[18,26],d:[13,16],f:[3,4],kind:'retail',gap:1.5,setback:3.2},
  vana:{w:[9,12],d:[9,11],f:[1,2],kind:'house',gap:6,setback:4},
  raama:{w:[9,11],d:[9,11],f:[1,2],kind:'detached',gap:14,setback:9},
  raekula:{w:[10,12],d:[10,12],f:[1,2],kind:'detached',gap:16,setback:10},
  ulejoe:{w:[56,72],d:[12,13],f:[5,5],kind:'apartments',gap:16,setback:16,skipKinds:['primary']},
  mai:{w:[48,64],d:[12,13],f:[5,9],kind:'apartments',gap:18,setback:16,skipKinds:['primary']},
  papiniidu:{w:[34,64],d:[22,36],f:[1,2],kind:'warehouse',gap:16,setback:14},
  beach:{w:[10,14],d:[10,12],f:[2,2],kind:'house',gap:26,setback:12}
 };
 // the ground of each lot: a garden behind a private house (trees), a paved yard round blocks of flats and works
 const obstacle=poly=>{const ctr=mul(poly.reduce((s,p)=>add(s,p),[0,0]),1/poly.length),rad=Math.max(...poly.map(p=>dist(p,ctr)));const k=rkey(Math.floor(ctr[0]/rc),Math.floor(ctr[1]/rc));if(!bgrid.has(k))bgrid.set(k,[]);bgrid.get(k).push({poly,ctr,rad});};
 const plot=(c,dir,n,side,w,dp,st,d)=>{
  if(['vana','raama','raekula','beach'].includes(d)){const depth=d==='vana'?14:24,g=rect(add(c,mul(n,side*(dp/2+depth/2+0.5))),dir,w+Math.min(st.gap,8),depth);
   if(!g.some(p=>!insideTown(p)||riverDist(p)<RIVER_HALF+6||railDist(p)<10)&&clearRoads(g,0.5)&&!overlapsBuilding(g)){obstacle(g);areas.push({kind:'garden',p:g.map(P)});}}
  else{const pad=d==='papiniidu'?9:5,y=rect(c,dir,w+pad*2,dp+pad*2);if(clearRoads(y,0.3))areas.push({kind:d==='papiniidu'?'industrial':'civic_yard',p:y.map(P)});}};
 const order=[...roads].sort((a,b)=>({service:3,living_street:0,residential:1,secondary:2,primary:4})[a.kind]-({service:3,living_street:0,residential:1,secondary:2,primary:4})[b.kind]);
 for(const r of order){if(r.bridge)continue;let carry=0;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],L=dist(a,b),dir=norm(sub(b,a)),n=perp(dir);
  for(const side of [1,-1]){let t=4+carry;while(t<L-4){const at=add(a,mul(dir,t)),d=districtOf(add(at,mul(n,side*20)));const st=STYLE[d];if(!st||st.skipKinds?.includes(r.kind)||(r.kind==='service'&&!['ulejoe','mai','papiniidu'].includes(d))){t+=12;continue;}
   const w=st.w[0]+rnd()*(st.w[1]-st.w[0]),dp=st.d[0]+rnd()*(st.d[1]-st.d[0]),f=Math.round(st.f[0]+rnd()*(st.f[1]-st.f[0]));const c=add(add(at,mul(dir,w/2)),mul(n,side*(r.width/2+st.setback+dp/2+2.8)));
   const kind=d==='papiniidu'?(rnd()<.4?'industrial':'warehouse'):d==='centre'&&rnd()<.35?'apartments':st.kind;
   if(place(rect(c,dir,w,dp),f,kind,d)){t+=w+st.gap;plot(c,dir,n,side,w,dp,st,d);}else t+=6;}}}}
 // the second row: courtyard houses and outbuildings behind the street front of the centre and the old posad
 for(const r of order){if(r.bridge||r.kind==='service')continue;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],L=dist(a,b),dir=norm(sub(b,a)),n=perp(dir);
  for(const side of [1,-1]){let t=6;while(t<L-6){const at=add(a,mul(dir,t)),d=districtOf(add(at,mul(n,side*30)));if(d!=='centre'&&d!=='vana'){t+=14;continue;}
   const w=d==='centre'?14+rnd()*8:7+rnd()*4,dp=d==='centre'?12+rnd()*4:6+rnd()*3,back=r.width/2+(d==='centre'?3.2+16+8:4+11+6)+dp/2+2.8;
   const c=add(add(at,mul(dir,w/2)),mul(n,side*back));if(place(rect(c,dir,w,dp),d==='centre'?2+Math.round(rnd()):1,d==='centre'?'apartments':'house',d))t+=w+(d==='centre'?6:12);else t+=7;}}}}
 // panel courts: slabs along the inner side of every superblock loop
 for(const l of loops){const corner=(x,y)=>[l.ctr[0]+x*l.c-y*l.s,l.ctr[1]+x*l.s+y*l.c];const u=[l.c,l.s],v=[-l.s,l.c];
  for(const [x,y,dir] of [[0,-l.h+20,u],[0,l.h-20,u],[-l.h+20,0,v],[l.h-20,0,v]]){const f=l.id==='mai'&&rnd()<.3?9:5;place(rect(corner(x,y),dir,Math.min(64,l.h*1.3),12),f,'apartments',l.id);}}
 // empty land inside the town: a town garden near the centre, copses and meadows with trees elsewhere
 {const cs=40;for(let x=-1700;x<1900;x+=cs)for(let y=-1700;y<1700;y+=cs){const c=[x+cs/2,y+cs/2];if(!insideTown(c)||riverDist(c)<RIVER_HALF+20||railDist(c)<18)continue;
  const poly=[[x,y],[x+cs,y],[x+cs,y+cs],[x,y+cs]];if(!clearRoads(poly,4)||overlapsBuilding(poly.map(p=>add(c,mul(sub(p,c),1.6)))))continue;if(parks.some(pk=>insidePoly(c,pk)))continue;
  areas.push({kind:dist(c,SQUARE)<720?'park':'scrub',p:poly});}}
 // ---- districts anchored on the network ----
 const allPts=roads.flatMap(r=>r.p);
 const snap=p=>allPts.reduce((b,q)=>dist(q,p)<dist(b,p)?q:b,allPts[0]);
 const DISTRICTS=DISTRICTS_PLAN.map(([id,name,c,,sector])=>[id,name,...(id==='centre'?BASES.HQ:snap(c)),sector]);
 const crossings=[];for(const r of roads)if(r.kind==='primary'||r.kind==='secondary'){const p=r.p[Math.floor(r.p.length/2)];if(dist(p,SQUARE)<700)crossings.push({p,axis:'x',width:6});}
 const emb=roads.filter(r=>r.name==='Береговая улица').flatMap(r=>r.p).reduce((b,q)=>dist(q,[150,450])<dist(b,[150,450])?q:b,[1e9,1e9]);
 const museum=civic.find(c=>c.kind==='museum'),ctrOf=poly=>P(mul(poly.reduce((s,p)=>add(s,p),[0,0]),1/poly.length));
 const trade=roads.filter(r=>r.name==='Торговая улица').flatMap(r=>r.p).reduce((b,q)=>Math.abs(dist(q,sq)-120)<Math.abs(dist(b,sq)-120)?q:b,[1e9,1e9]);
 const walkTargets=[{key:'museum',name:'Городской музей',address:'Музейная улица',carAccess:museum.entrance,entrance:ctrOf(museum.poly),kind:'entrance'},
  {key:'ruutli',name:'Торговая улица',address:'Торговая улица',carAccess:trade,entrance:P(add(trade,mul(perp(norm(sub(sq,trade))),12))),kind:'public_space'},
  {key:'malmo',name:'Береговая улица',address:'Береговая улица',carAccess:emb,entrance:P(add(emb,mul(norm(sub(emb,[-200,450])),14))),kind:'public_space'}];
 // the town-hall square is the origin of the published plan (QUARTER_CENTRE, the camera's town view)
 const T=p=>P([p[0]-SQUARE[0],p[1]-SQUARE[1]]),TT=list=>list.map(T);
 const out={schema:2,id:'meridian-city-v2',source:'Mercury Response — original authored town, Claude City 2.0 plan',date:'2026-10-22',bbox:[24.455,58.355,24.59,58.425],populationTarget:15000,layoutScale:LAYOUT_SCALE,roads,buildings,areas,coasts:[],districts:DISTRICTS,bases:BASES,crossings,civic:civic.map(c=>({name:c.name,kind:c.kind,entrance:c.entrance})),walkTargets,river:RIVER.map(P),riverFar:riverPoly,countrySea:(()=>{const c=RIVER_FAR.filter((p,i)=>i%8===0||i===RIVER_FAR.length-1);const o=(side)=>c.map((p,i)=>{const a=c[Math.max(0,i-1)],b=c[Math.min(c.length-1,i+1)];return P(add(p,mul(norm(perp(sub(b,a))),side*(RIVER_HALF+30))));});return [...o(1),...o(-1).reverse()];})(),exits:EXITS.map(e=>P(e[2])),rail:RAIL.map(P),station:P(STATION)};
 out.roads=out.roads.map(r=>({...r,p:TT(r.p)}));out.buildings=out.buildings.map(b=>({...b,p:TT(b.p)}));out.areas=out.areas.map(a=>({...a,p:TT(a.p)}));
 out.districts=out.districts.map(([id,name,x,y,sector])=>[id,name,...T([x,y]),sector]);out.bases=Object.fromEntries(Object.entries(out.bases).map(([k,v])=>[k,T(v)]));
 out.crossings=out.crossings.map(c=>({...c,p:T(c.p)}));out.civic=out.civic.map(c=>({...c,entrance:T(c.entrance)}));out.walkTargets=out.walkTargets.map(t=>({...t,carAccess:T(t.carAccess),entrance:T(t.entrance)}));
 for(const k of ['river','riverFar','countrySea','exits','rail'])out[k]=TT(out[k]);out.station=T(out.station);out.square=[0,0];
 return out;
}
export function validate(city){
 const errors=[],graph=new Map();for(const r of city.roads)for(let i=0;i<r.nodes.length;i++){const id=r.nodes[i];if(!graph.has(id))graph.set(id,new Set());if(i){graph.get(r.nodes[i-1]).add(id);if(r.oneway!=='yes')graph.get(id).add(r.nodes[i-1]);}}
 const visit=(reverse=false)=>{const seen=new Set([graph.keys().next().value]),queue=[...seen],g=new Map([...graph].map(([id])=>[id,new Set()]));for(const [a,edges] of graph)for(const b of edges)g.get(reverse?b:a).add(reverse?a:b);for(let i=0;i<queue.length;i++)for(const id of g.get(queue[i]))if(!seen.has(id)){seen.add(id);queue.push(id);}return seen.size;};
 if(visit()!==graph.size||visit(true)!==graph.size)errors.push('Road graph is not strongly connected');
 // buildings keep a sidewalk from every carriageway (exact polygon–segment distance) and stay out of the river
 const cell=60,grid=new Map();for(const r of city.roads)for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i];for(let x=Math.floor((Math.min(a[0],b[0])-10)/cell);x<=Math.floor((Math.max(a[0],b[0])+10)/cell);x++)for(let y=Math.floor((Math.min(a[1],b[1])-10)/cell);y<=Math.floor((Math.max(a[1],b[1])+10)/cell);y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([a,b,r]);}}
 for(const b of city.buildings){const xs=b.p.map(p=>p[0]),ys=b.p.map(p=>p[1]);let bad=null;
  for(let x=Math.floor((Math.min(...xs)-10)/cell);x<=Math.floor((Math.max(...xs)+10)/cell)&&!bad;x++)for(let y=Math.floor((Math.min(...ys)-10)/cell);y<=Math.floor((Math.max(...ys)+10)/cell)&&!bad;y++)for(const [a,c,r] of grid.get(x+','+y)??[]){for(let i=0;i<b.p.length;i++)if(segSegDist(b.p[i],b.p[(i+1)%b.p.length],a,c)<r.width/2+2.6){bad=r;break;}if(bad)break;}
  if(bad)errors.push(`${b.id} overlaps ${bad.id}`);if(b.p.some(p=>riverDist([p[0]+SQUARE[0],p[1]+SQUARE[1]])<RIVER_HALF))errors.push(`${b.id} overlaps river`);}
 for(const [id,p] of [...Object.entries(city.bases).filter(([,p])=>p||!errors.push('base missing')),...city.districts.map(d=>[d[0],d.slice(2,4)])])if(!city.roads.some(r=>r.p.some((q,i)=>i&&segDist(p,r.p[i-1],q)<1e-6)))errors.push(`${id} is off road`);
 if(errors.length)throw Error(errors.slice(0,20).join('\n')+(errors.length>20?`\n… ${errors.length} errors`:''));
 return {nodes:graph.size,roads:city.roads.length,buildings:city.buildings.length,districts:city.districts.length,bases:Object.keys(city.bases).length,stronglyConnected:true,buildingRoadOverlaps:0};
}
export function write(city,out){
 validate(city);
 fs.mkdirSync(out,{recursive:true});const js=c=>`// Generated by tools/city-v2/generate.mjs. Do not edit.\nexport default ${JSON.stringify(c)};\n`;
 const data={...city,roads:city.roads.map(r=>({...r,p:r.p.map(world)})),buildings:city.buildings.map(b=>({...b,p:b.p.map(world)})),areas:city.areas.map(a=>({...a,p:a.p.map(world)}))};
 fs.writeFileSync(path.join(out,'city-data.js'),js(data));
 fs.writeFileSync(path.join(out,'geography.js'),fs.readFileSync(new URL('./geography.template.js',import.meta.url)));
 const sq=world([0,0]);
 const quarter={source:city.source,bounds:[sq[0]-.15,sq[1]-.1,sq[0]+.15,sq[1]+.1],objects:[{id:'v2-fountain-01',kind:'fountain',p:world([0,0])},...[-40,0,40].map((x,i)=>({id:'v2-lamp-0'+i,kind:'lamp',p:world([x,28])}))],excluded:[],
  streetInfo:city.roads.map(r=>({id:r.id,width:String(r.width),surface:r.name==='Ратушная площадь'||r.kind==='living_street'?'paving_stones':'asphalt',lit:'yes',sidewalk:r.kind==='service'?'no':'both'})),
  buildings:city.buildings.map(b=>({id:b.id,height:String(b.h*3),name:b.name})),waterEdges:[]};
 for(const a of data.areas.filter(a=>a.kind==='water'))for(let i=0;i<a.p.length;i++)quarter.waterEdges.push([a.p[i],a.p[(i+1)%a.p.length]]);
 fs.writeFileSync(path.join(out,'quarter-data.js'),js(quarter));
 const walking=walkingNetwork(city,world);
 fs.writeFileSync(path.join(out,'walking-network.js'),js(walking));
 fs.writeFileSync(path.join(out,'city-v2-plan.json'),JSON.stringify(city,null,2)+'\n');
 fs.writeFileSync(path.join(out,'city-v2-validation.json'),JSON.stringify(validate(city),null,2)+'\n');
}
let CACHE=null;const cached=()=>CACHE??=generate();
export const BASES=(()=>{try{return cached().bases;}catch{return {};}})();
export const DISTRICTS=(()=>{try{return cached().districts;}catch{return [];}})();
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){const city=cached();write(city,path.resolve(process.argv[2]??'city-v2-output'));console.log(validate(city));}
