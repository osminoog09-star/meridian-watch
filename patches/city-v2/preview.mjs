import fs from 'node:fs';
import {generate,validate} from './generate.mjs';
import {BASES} from './generate.mjs';const city=generate();let v='ok';try{v=JSON.stringify(validate(city));}catch(e){v=String(e.message).split('\n').slice(0,3).join(' | ');console.error(e.message.split('\n').slice(0,25).join('\n'));}
const colors={centre:'#e2b97f',ulejoe:'#9fb6cc',raama:'#d2b98a',beach:'#d9c3a0',mai:'#b0b8d4',papiniidu:'#9aa1a4',vana:'#c58f6c',raekula:'#bcc994'};
const AREA={scrub:'#a9c08e',garden:'#93b97a',civic_yard:'#b9b6aa',industrial:'#a8a69c',water:'#3f86a0',park:'#5f8f5a',grass:'#78a067',forest:'#3e6b42',square:'#c9bfa8',railway:'#6b625a'};
const p=points=>points.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
const [x0,y0,x1,y1]=[-1440,-1920,2160,1880];
const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" width="1800" height="1900"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="#cfd8bf"/>`];
for(const a of city.areas)parts.push(`<polygon points="${p(a.p)}" fill="${AREA[a.kind]??'#999'}"/>`);
for(const r of city.roads)parts.push(`<polyline points="${p(r.p)}" fill="none" stroke="${r.bridge?'#b08040':r.kind==='primary'?'#fff3c4':r.kind==='service'?'#e8e8e8':'#ffffff'}" stroke-width="${r.width}" stroke-linecap="round" stroke-linejoin="round"/>`);
for(const b of city.buildings)parts.push(`<polygon points="${p(b.p)}" fill="${['police','hospital','ambulance','fire_station'].includes(b.kind)?'#d03030':colors[b.district]??'#888'}" stroke="#5a4a3a" stroke-width="0.6"/>`);
for(const [id,name,x,y] of city.districts)parts.push(`<text x="${x}" y="${y}" fill="#202020" font-family="sans-serif" font-size="40" text-anchor="middle" opacity=".7">${name}</text>`);
for(const [name,b] of Object.entries(city.bases))if(b){const [x,y]=b;parts.push(`<circle cx="${x}" cy="${y}" r="10" fill="#e02020"/><text x="${x+14}" y="${y+10}" fill="#900" font-family="sans-serif" font-size="30">${name}</text>`);}
parts.push(`<text x="${x0+30}" y="${y0+60}" font-size="44" font-family="sans-serif">roads ${city.roads.length} · buildings ${city.buildings.length} · ${v.slice(0,120)}</text></svg>`);
fs.writeFileSync(process.argv[2],parts.join('\n'));
