// Sidewalks follow the same authored street vertices, offset beyond the carriageway.
// Junction links are explicit crossings; yard lanes remain shared pedestrian access.
export function walkingNetwork(city,world){
 const net={source:city.source,candidates:0,rejectedGeometry:0,components:1,nodes:{},segments:[],entrances:[],destinations:[]};
 const native=new Map(),junctions=new Map(),seen=new Set();
 const node=(p,id)=>{const q=p.map(v=>Math.round(v*1e6)/1e6);id??='v2-foot-'+q.join(',');native.set(id,q);net.nodes[id]=world(q);return id;};
 const edge=(a,b,extra={})=>{const key=[a,b].sort().join('|');if(a===b||seen.has(key))return;seen.add(key);net.segments.push({way:'v2-foot-'+net.segments.length,a,b,p:[net.nodes[a],net.nodes[b]],name:'Городской тротуар',kind:'footway',bridge:false,...extra});};
 for(const road of city.roads){
  const first=road.p[0],last=road.p.at(-1),length=Math.hypot(last[0]-first[0],last[1]-first[1]);
  const normal=[-(last[1]-first[1])/length,(last[0]-first[0])/length];
  const shared=road.kind==='service',offset=shared?0:road.width/2+1.4;
  for(const side of shared?[0]:[-1,1]){
   let previous;
   road.p.forEach((p,i)=>{
    const id=node([p[0]+normal[0]*offset*side,p[1]+normal[1]*offset*side]);
    if(previous)edge(previous,id,{roadId:road.id,bridge:road.bridge,shared,name:shared?'Дворовой проход':'Тротуар · '+road.name});previous=id;
    const key=road.nodes[i];if(!junctions.has(key))junctions.set(key,[]);
    junctions.get(key).push({id,road:road.id,endpoint:i===0||i===road.p.length-1});
   });
  }
 }
 for(const entries of junctions.values()){
  if(new Set(entries.map(e=>e.road)).size<2&&!entries.some(e=>e.endpoint))continue;
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)edge(entries[i].id,entries[j].id,{crossing:true,name:'Пешеходный переход'});
 }
 const nearest=p=>[...native].reduce((best,e)=>!best||Math.hypot(e[1][0]-p[0],e[1][1]-p[1])<Math.hypot(best[1][0]-p[0],best[1][1]-p[1])?e:best,null);
 const roadNodes=new Map(city.roads.flatMap(r=>r.nodes.map((id,i)=>[id,r.p[i]])));
 // Parking nodes are dead-end links to a sidewalk, never longitudinal walking lanes.
 const bridgeNodes=new Set(city.roads.filter(r=>r.bridge).flatMap(r=>r.nodes));
 const parking=[...roadNodes].filter(([id])=>!bridgeNodes.has(id)).map(([id,p])=>({id,p,walk:nearest(p)[0]}));
 for(const {id,p,walk} of parking){node(p,id);edge(id,walk,{access:true,crossing:true,name:'Выход из машины к тротуару'});}
 for(const [key,wanted,name] of [['museum',[-120,0],'Городской музей'],['ruutli',[0,-120],'Торговая улица'],['malmo',[480,960],'Береговая улица']]){
  const desired=wanted.map(v=>v*(city.layoutScale??1));
  const [carAccess,car]=[...roadNodes].sort((a,b)=>Math.hypot(a[1][0]-desired[0],a[1][1]-desired[1])-Math.hypot(b[1][0]-desired[0],b[1][1]-desired[1]))[0];
  const entrance=key==='museum'?[-155,-62].map(v=>v*(city.layoutScale??1)):[car[0]+(key==='malmo'?-12:12),car[1]+12];
  const [walkAccess]=nearest(car),[approach]=nearest(entrance);
  node(car,carAccess);edge(carAccess,walkAccess,{crossing:true,name:'Выход из машины к тротуару'});
  const id=node(entrance,'v2-walk-'+key);edge(approach,id,{name:'Подход к месту'});
  const dest={key,id,p:net.nodes[id],name,address:key==='museum'?'Музейная улица':name,carAccess,duration:10,kind:key==='museum'?'entrance':'public_space',...(key==='museum'?{building:city.buildings.find(b=>b.kind==='museum').id}:{}),source:city.source};
  net.destinations.push(dest);if(key==='museum')net.entrances.push({...dest,entrance:'yes'});
 }
 net.candidates=net.segments.length;
 return net;
}
