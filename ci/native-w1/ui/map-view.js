import {warmTraffic,trafficActors} from './street-traffic.js';
import {crewPresentation} from './source/crew.js';
import {sceneAnchor} from './source/scenes.js';
import {emergencyLights} from './source/lighting.js';
import {residentPosition,residentProfile} from './source/population.js';
import {WALK_STATUSES} from './source/visits.js';
import {vehicleDoors} from './source/vehicle-doors.js';
import {vehicleStyle} from './vehicle-style.js';
import {heroLook} from './source/hero.js';
import {humanStyle} from './human-style.js';
import {GBR_BASE,prefectureOn,HQ,HOSPITAL,FIRE_STATION} from './source/sim.js';
import {homeOf} from './source/home.js';
import {callsign,serviceCallsign} from './source/radio.js';
import {byId,point} from './source/geography.js';
/* Claude 17.10 (Release R4 «Город 2.0»): the places that matter, for the landmark masts and signs */
function placesOf(state){const out=[{kind:'hq',...HQ,label:'Полицейский участок'},{kind:'fire',...FIRE_STATION,label:'Пожарная часть'},{kind:'hospital',...HOSPITAL,label:'Больница'}];if(prefectureOn(state))out.push({kind:'gbr',...GBR_BASE,label:'Префектура · ГБР'});if(state.mode==='career'&&state.life&&state.schedule==='ppa'){const h=homeOf(state.life),p=point(byId(h.district));out.push({kind:'home',x:p.x+.004,y:p.y+.003,label:'Ваш дом'});}return out;}
import {streetPlan,planPosition,streetPending,cityClock} from './source/cityday.js';
/* Claude 17.10 (Release O3 «Живой город»): citizens of the registry on the streets near the camera, refreshed twice a second */
let street=[],streetAt=null;const PALETTE=['#c6a7e9','#ddcfa6','#9bbade','#ccaaa7','#a9d3b4','#e0c08a','#b7b7c9','#d7a3b8'];
function citizensNear(state){const el=state.population?.elapsed??0,scene=globalThis.nativeScene;if(!scene||state.mode==='chief'&&state.setupPending)return [];
 /* Performance (17.10): the plan (who is outside, their routes) at most every 0.7 s of real time and only when needed; positions every frame are cheap */
 const now=Date.now(),radius=Math.min(.35,Math.max(260,1.6*6500/Math.max(.2,scene.zoom??6))/1670),moved=!streetAt||Math.hypot(scene.x-streetAt.x,scene.y-streetAt.y)>radius*.3||Math.abs(radius-streetAt.radius)>radius*.3;
 if(now-(streetAt?.time??0)>700&&(moved||now-streetAt.time>2500||streetPending()||street.some(e=>!e.walk&&cityClock(el).minute>=e.until))){warmTraffic();streetAt={x:scene.x,y:scene.y,radius,time:now};street=streetPlan(el,scene,{rain:globalThis.nativeAudioFrame?.environment?.weather==='rain',routes:1,radius}).map(e=>({...e,nativeStyle:humanStyle(false,PALETTE[e.id%PALETTE.length]),vehicleStyle:vehicleStyle({color:PALETTE[(e.id>>3)%PALETTE.length]},false)}));}
 const minute=cityClock(el).minute;return street.map(e=>{const p=planPosition(e,minute);return {id:e.id,name:e.name,car:e.car,x:p.x,y:p.y,heading:p.heading,status:e.car?'citizenCar':'citizenWalk',nativeStyle:e.nativeStyle,vehicleStyle:e.vehicleStyle};});}
/* Release J1: the taxi orders and the current ride on the map, drawn like calls */
const taxiMarks=state=>{const r=state.units[0]?.ride,list=(state.taxi?.orders??[]).map(o=>({id:1000+o.id,x:o.from.x,y:o.from.y,state:'waiting',type:0,anchor:{x:o.from.x,y:o.from.y},participants:[]}));if(r){const p=r.phase==='ride'?r.to:r.from;list.push({id:2000+r.id,x:p.x,y:p.y,state:'onscene',type:0,anchor:{x:p.x,y:p.y},participants:[]});}return list;};
/* Claude 17.10 (Release R1): the prefecture's rapid response team is somewhere in the city even when no call needs it — its car stands at the base */
const standbyTeam=state=>prefectureOn(state)&&!(state.services??[]).some(a=>a.kind==='gbr')?[{id:0,kind:'gbr',x:GBR_BASE.x+0.0006,y:GBR_BASE.y,route:[],status:'standby',heading:0,standby:true}]:[];

// Read-only presentation: use the same visibility and anchors as the original map.
export function mapActors(state) {
 return {
  units: state.units.map(u => ({
   id:u.id,callsign:state.agency==='taxi'?u.name:callsign(u),mine:state.mode==='career'&&u.id===1,x:u.x,y:u.y,status:u.status,incident:u.incident,route:u.route,
   target:u.route?.[0],heading:u.renderHeading??u.heading??0,
   people:u.people,vehicleId:u.vehicleId,foot:u.foot,doors:vehicleDoors(u),emergency:emergencyLights(u,state),
   crew:u.people.map((_,index)=>{
    const activity=crewPresentation(state,u,index);
    return {...activity,...(activity.position??{x:u.x-0.001*(index+1),y:u.y}),unitId:u.id,nativeStyle:humanStyle(true,undefined,u.agency??state.agency,state.mode==='career'&&u.id===1&&index===0?heroLook(state.hero):null)};
   }).filter(a=>a.visible)
  })),
  vehicles:state.vehicles.map(v=>({...v,nativeStyle:state.agency==='taxi'?vehicleStyle({color:'#e8c33a'},false):vehicleStyle(v)})),/* J1: a yellow taxi, no lights */services:[...(state.services??[]),...standbyTeam(state)].map(a=>({...a,callsign:a.standby?'ГБР · база':serviceCallsign(a)})).map(a=>a.kind==='police'||a.kind==='lead'?{...a,nativeStyle:vehicleStyle({paint:'white',lights:'redblue'}),emergency:a.kind==='lead'?a.status==='responding':a.status!=='returning'}:a.kind==='gbr'||a.kind==='kk'?{...a,nativeStyle:vehicleStyle({paint:a.kind==='kk'?'grey':'black',lights:'blue'}),emergency:!a.standby&&a.status!=='returning'}:a),/* Release K: a city patrol at a joint scene */
  residents:(state.population?.residents??[]).filter(r=>
   WALK_STATUSES.includes(r.status)||r.status==='recovering'||
   (r.route?.length&&r.status!=='incident'&&!['home','work'].includes(r.status))
  ).map(r=>({...r,...residentPosition(r),walking:['walkVisit','walkBack'].includes(r.status)&&!!r.route?.length,nativeStyle:humanStyle(false,residentProfile(r.id)?.color),vehicleStyle:vehicleStyle({color:residentProfile(r.id)?.color},false)})),
  citizens:citizensNear(state),
  traffic:state.mode==='chief'&&state.setupPending?[]:trafficActors(state.population?.elapsed??0,globalThis.nativeScene,Math.min(.35,Math.max(260,1.6*6500/Math.max(.2,globalThis.nativeScene?.zoom??6))/1670)),
  places:placesOf(state),
  incidents:state.agency==='taxi'?taxiMarks(state):state.incidents.filter(i=>!['resolved','missed'].includes(i.state)).map(i=>({
   id:i.id,x:i.x,y:i.y,state:i.state,type:i.type,anchor:sceneAnchor(i),
   participants:(i.scene?.participants??[]).filter(a=>a.visible).map(a=>({...a,nativeStyle:humanStyle(false,residentProfile(a.residentId)?.color),walking:!!a.route?.length}))
  }))
 };
}
