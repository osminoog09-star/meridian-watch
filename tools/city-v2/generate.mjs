import {walkingNetwork} from './walking.mjs';
/** Meridian 2: authored town plan, in metres. No OSM geometry or random state. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ORIGIN=[1.55,2.52], SCALE=1670;
export const world=([x,y])=>[ORIGIN[0]+x/SCALE,ORIGIN[1]+y/SCALE];
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export const DISTRICTS=[
 ['centre','Центр',0,0,'west'],['ulejoe','Заречье',1200,-480,'east'],
 ['raama','Северная слобода',-960,-1920,'west'],['beach','Речной парк',0,960,'west'],
 ['mai','Майский',2160,0,'east'],['papiniidu','Промышленный',2880,-2160,'east'],
 ['vana','Старый посад',-1200,-480,'west'],['raekula','Сосновый бор',3120,960,'east']
];
export const BASES={HQ:[0,0],HOSPITAL:[1200,-480],FIRE_STATION:[2400,-1440],GBR_BASE:[2880,-2160],AMBULANCE:[1200,-720]};
const district=(x,y)=>x<480?(y>720?'beach':y< -1200?'raama':x< -480?'vana':'centre'):
 x>2400&&y< -1200?'papiniidu':y>480&&x>2400?'raekula':x<1680?'ulejoe':'mai';
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);};
function segmentBox(a,b,box){
 let lo=0,hi=1;for(let k=0;k<2;k++){const d=b[k]-a[k];if(Math.abs(d)<1e-9){if(a[k]<box[k]||a[k]>box[k+2])return false;}else{let u=(box[k]-a[k])/d,v=(box[k+2]-a[k])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}return true;
}
export function generate(){
 const roads=[],buildings=[],areas=[],crossings=[],nodes=new Map();
 const node=p=>{const key=p.map(v=>Math.round(v*1e6)/1e6).join(',');if(!nodes.has(key))nodes.set(key,'v2-'+key);return nodes.get(key);};
 const road=(a,b,kind='residential',name='Квартальная улица',extra={})=>{
  const width=({primary:9,secondary:8,residential:6,service:4,living_street:4.5})[kind];
  const r={id:'v2-road-'+roads.length,p:[a,b],nodes:[node(a),node(b)],kind,name,drive:true,bridge:false,oneway:'no',width,
   speedTags:{maxspeed:String(kind==='primary'?50:kind==='secondary'?40:kind==='service'?10:kind==='living_street'?20:30)},...extra};roads.push(r);return r;
 };
 const xs=Array.from({length:23},(_,i)=>-1680+i*240),ys=Array.from({length:19},(_,i)=>-2880+i*240);
 // Rectangular blocks are deliberate: two bridges make distinct dispatch catchments.
 for(const y of ys)for(let i=1;i<xs.length;i++){
  const a=[xs[i-1],y],b=[xs[i],y],bridge=a[0]===480;
  if(bridge&&![-1200,720].includes(y))continue;
  const bypass=[ys[0],ys.at(-1)].includes(y),main=[-1200,0,720].includes(y);
  if(bridge&&!main)continue;
  road(a,b,bypass||bridge?'primary':main?'secondary':'residential',bypass?'Объездная дорога':y===-1200?'Главная улица':y===720?'Мостовая улица':y===0?'Ратушная улица':`Квартальная ${ys.indexOf(y)+1}`,{bridge});
 }
 for(const x of xs)for(let i=1;i<ys.length;i++){
  const bypass=[xs[0],xs.at(-1)].includes(x),main=[0,1200,2400].includes(x);
  road([x,ys[i-1]],[x,ys[i]],bypass?'primary':main?'secondary':'residential',bypass?'Объездная дорога':x===0?'Центральный проспект':x===1200?'Заречная улица':x===2400?'Промышленная улица':`Продольная ${xs.indexOf(x)+1}`);
 }
 // Replace an ordinary junction with a real connected roundabout (no road across its island).
 const centre=[0,-1200],radius=32;
 for(const r of roads)for(let k=0;k<2;k++)if(r.p[k][0]===centre[0]&&r.p[k][1]===centre[1]){
  const other=r.p[1-k],d=Math.hypot(other[0]-centre[0],other[1]-centre[1]);
  r.p[k]=[centre[0]+radius*(other[0]-centre[0])/d,centre[1]+radius*(other[1]-centre[1])/d];r.nodes[k]=node(r.p[k]);
 }
 const circle=Array.from({length:24},(_,i)=>[Math.round(Math.cos(i*Math.PI/12)*radius*1e6)/1e6,-1200+Math.round(Math.sin(i*Math.PI/12)*radius*1e6)/1e6]);
 for(let i=0;i<circle.length;i++)road(circle[i],circle[(i+1)%circle.length],'secondary','Круг у ратуши',{oneway:'yes',junction:'roundabout',width:6,speedTags:{maxspeed:'20'}});
 areas.push({kind:'park',p:circle.map(([x,y])=>[x*.65,-1200+(y+1200)*.65])});
 // Drivable exits, within the longstanding simulation coverage envelope.
 for(const [a,b,name] of [[[0,-2880],[0,-3960],'Северный тракт'],[[-1680,-1200],[-2400,-1200],'Западный тракт'],[[3600,-1200],[4800,-1200],'Восточный тракт'],[[2400,1440],[2400,3000],'Южный тракт']])road(a,b,'primary',name,{speedTags:{maxspeed:'70'}});
 const addBuilding=(x,y,w,h,floors,kind,d,name='')=>buildings.push({id:'v2-building-'+buildings.length,p:rect(x,y,w,h),h:floors,kind,district:d,name});
 const reserved=new Set(['-240,-1200','0,-1200','-240,-1440','0,-1440','-240,-240','0,-240','0,0','960,-720','960,-960','2160,-1680','2640,-2400','-240,720']);
 for(let ix=0;ix<xs.length-1;ix++)for(let iy=0;iy<ys.length-1;iy++){
  const x=xs[ix],y=ys[iy];if(x===480)continue;
  const d=district(x+120,y+120),key=x+','+y;
  if(reserved.has(key)){areas.push({kind:'grass',p:rect(x+18,y+18,204,204)});continue;}
  // A green break every few blocks creates landmarks and keeps the plan legible.
  if((ix*7+iy*11)%19===0||d==='beach'){
   areas.push({kind:d==='beach'?'park':'grass',p:rect(x+22,y+22,196,196)});continue;
  }
  if(d==='papiniidu'){
   addBuilding(x+28,y+32,84,54,2,'warehouse',d);addBuilding(x+136,y+32,70,120,2,'industrial',d);
   road([x,y+120],[x+120,y+120],'service','Складской проезд');
   // Split the street at the driveway's junction below.
  }else if(['mai','ulejoe'].includes(d)){
   for(const [dx,dy,w,h] of [[30,28,162,18],[30,184,162,18],[28,70,18,90]])addBuilding(x+dx,y+dy,w,h,5,'apartments',d);
   road([x+240,y+120],[x+120,y+120],'service','Дворовой проезд');
   areas.push({kind:'garden',p:rect(x+65,y+70,40,90)});
  }else if(d==='centre'){
   for(const [dx,dy,w,h] of [[24,24,70,28],[126,24,86,28],[24,160,28,52],[130,180,80,28]])addBuilding(x+dx,y+dy,w,h,2+(ix+iy)%2,'retail',d);
  }else{
   for(let row=0;row<2;row++)for(let col=0;col<5;col++)addBuilding(x+25+col*40,y+25+row*160,14+(col%2)*3,20, d==='vana'?2:1,'house',d);
   areas.push({kind:'garden',p:rect(x+28,y+65,180,90)});
  }
 }
 // First-stage footprints reserve every civic site; detailed buildings belong to stage two/three.
 for(const b of [[-190,-190,100,42,3,'civic','Ратуша'],[-190,-110,70,48,2,'museum','Городской музей'],[30,-190,72,36,2,'bus_station','Автовокзал'],[130,-190,55,32,2,'retail','Магазины'],[30,35,80,42,2,'police','Полиция'],[140,35,48,24,2,'commercial','Бар «Мост»'],[990,-680,140,64,3,'hospital','Больница'],[990,-920,72,38,1,'ambulance','Скорая помощь'],[2200,-1600,100,55,2,'fire_station','Пожарная часть'],[2680,-2320,100,55,2,'police','База ГБР'],[-200,780,80,36,2,'school','Школа'],[-85,790,35,58,3,'church','Церковь']]){
  const [x,y,w,h,f,kind,name]=b;addBuilding(x,y,w,h,f,kind,district(x,y),name);
 }
 // A single river corridor; bridges are the only roads across the water.
 areas.push({kind:'water',p:rect(496,-4100,208,7450)});
 // Snap/split T-junctions explicitly, including all yard entries. Rendering and routing share these vertices.
 for(const r of roads){const [a,b]=r.p,n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/60);r.p=Array.from({length:n+1},(_,i)=>[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);}
 const allPoints=new Map();for(const r of roads)for(const p of r.p)allPoints.set(p.join(','),p);
 for(const r of roads){const a=r.p[0],b=r.p.at(-1),points=[...allPoints.values()].filter(p=>distance(p,a,b)<1e-6).sort((p,q)=>Math.hypot(p[0]-a[0],p[1]-a[1])-Math.hypot(q[0]-a[0],q[1]-a[1]));r.p=points;r.nodes=points.map(node);}
 for(const y of [-240,0,240])for(const x of [-240,0,240,1200,2160])crossings.push({p:[x+24,y],axis:'x',width:6});
 return {schema:2,id:'meridian-city-v2',source:'Mercury Response — original authored town',date:'2026-10-21',bbox:[24.455,58.355,24.59,58.425],populationTarget:15000,roads,buildings,areas,coasts:[],districts:DISTRICTS,bases:BASES,crossings};
}
export function validate(city){
 const errors=[],graph=new Map();for(const r of city.roads)for(let i=0;i<r.nodes.length;i++){const id=r.nodes[i];if(!graph.has(id))graph.set(id,new Set());if(i){graph.get(r.nodes[i-1]).add(id);if(r.oneway!=='yes')graph.get(id).add(r.nodes[i-1]);}}
 const visit=(reverse=false)=>{const seen=new Set([graph.keys().next().value]),queue=[...seen],g=new Map([...graph].map(([id])=>[id,new Set()]));for(const [a,edges] of graph)for(const b of edges)g.get(reverse?b:a).add(reverse?a:b);for(let i=0;i<queue.length;i++)for(const id of g.get(queue[i]))if(!seen.has(id)){seen.add(id);queue.push(id);}return seen.size;};
 if(visit()!==graph.size||visit(true)!==graph.size)errors.push('Road graph is not strongly connected');
 for(const b of city.buildings){const xs=b.p.map(p=>p[0]),ys=b.p.map(p=>p[1]),box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  for(const r of city.roads){const gap=r.width/2+2.6,padded=[box[0]-gap,box[1]-gap,box[2]+gap,box[3]+gap];if(r.p.some((p,i)=>i&&segmentBox(r.p[i-1],p,padded))){errors.push(`${b.id} overlaps ${r.id}`);break;}}
  if(box[0]<704&&box[2]>496)errors.push(`${b.id} overlaps river`);
 }
 for(const [id,p] of [...Object.entries(city.bases),...city.districts.map(d=>[d[0],d.slice(2,4)])])if(!city.roads.some(r=>r.p.some((q,i)=>i&&distance(p,r.p[i-1],q)<1e-6)))errors.push(`${id} is off road`);
 if(errors.length)throw Error(errors.join('\n'));
 return {nodes:graph.size,roads:city.roads.length,buildings:city.buildings.length,districts:city.districts.length,bases:Object.keys(city.bases).length,stronglyConnected:true,buildingRoadOverlaps:0};
}
export function write(city,out){
 validate(city);
 fs.mkdirSync(out,{recursive:true});const js=c=>`// Generated by tools/city-v2/generate.mjs. Do not edit.\nexport default ${JSON.stringify(c)};\n`;
 const data={...city,roads:city.roads.map(r=>({...r,p:r.p.map(world)})),buildings:city.buildings.map(b=>({...b,p:b.p.map(world)})),areas:city.areas.map(a=>({...a,p:a.p.map(world)}))};
 fs.writeFileSync(path.join(out,'city-data.js'),js(data));
 fs.writeFileSync(path.join(out,'geography.js'),fs.readFileSync(new URL('./geography.template.js',import.meta.url)));
 const quarter={source:city.source,bounds:[1.4,2.42,1.7,2.62],objects:[{id:'v2-fountain-01',kind:'fountain',p:world([-65,-90])},...[-60,-20,20].map((x,i)=>({id:'v2-lamp-0'+i,kind:'lamp',p:world([x,12])}))],excluded:[],
  streetInfo:city.roads.map(r=>({id:r.id,width:String(r.width),surface:r.name==='Ратушная улица'?'paving_stones':'asphalt',lit:'yes',sidewalk:r.kind==='service'?'no':'both'})),
  buildings:city.buildings.map(b=>({id:b.id,height:String(b.h*3),name:b.name})),waterEdges:[]};
 for(const a of data.areas.filter(a=>a.kind==='water'))for(let i=0;i<a.p.length;i++)quarter.waterEdges.push([a.p[i],a.p[(i+1)%a.p.length]]);
 fs.writeFileSync(path.join(out,'quarter-data.js'),js(quarter));
 const walking=walkingNetwork(city,world);
 fs.writeFileSync(path.join(out,'walking-network.js'),js(walking));
 fs.writeFileSync(path.join(out,'city-v2-plan.json'),JSON.stringify(city,null,2)+'\n');
 fs.writeFileSync(path.join(out,'city-v2-validation.json'),JSON.stringify(validate(city),null,2)+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){const city=generate();write(city,path.resolve(process.argv[2]??'city-v2-output'));console.log(validate(city));}
