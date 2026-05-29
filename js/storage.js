const STORE = {
  ROUTES: 'rutas_maria_jesus_routes_v1',
  CONFIG: 'rutas_maria_jesus_config_v1',
  DEVICE: 'rutas_maria_jesus_device_v1',
  SYNC: 'rutas_maria_jesus_sync_v1'
};
function nowISO(){return new Date().toISOString();}
function uid(prefix='ID'){return prefix + '-' + Math.random().toString(16).slice(2,10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();}
function readJSON(key, fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch(e){return fallback;}}
function writeJSON(key, value){localStorage.setItem(key, JSON.stringify(value));}
function getDeviceId(){let id=localStorage.getItem(STORE.DEVICE); if(!id){id='DEVICE-'+Math.random().toString(16).slice(2,10).toUpperCase(); localStorage.setItem(STORE.DEVICE,id);} return id;}
function getRoutes(){return readJSON(STORE.ROUTES, []);}
function saveRoutes(routes){writeJSON(STORE.ROUTES, routes); window.dispatchEvent(new Event('routesChanged'));}
function nextCode(){const nums=getRoutes().map(r=>parseInt(String(r.codigo||'').replace(/\D/g,''),10)).filter(Boolean); const n=(nums.length?Math.max(...nums):0)+1; return String(n).padStart(4,'0');}
function upsertRoute(route){const routes=getRoutes(); const i=routes.findIndex(r=>r.id===route.id); const stamp=nowISO(); if(i>=0){route.createdAt=routes[i].createdAt||stamp; route.updatedAt=stamp; routes[i]=route;}else{route.id=route.id||uid('RUTA'); route.codigo=route.codigo||nextCode(); route.createdAt=stamp; route.updatedAt=stamp; routes.push(route);} route.deviceId=getDeviceId(); saveRoutes(routes); return route;}
function deleteRoute(id){if(!confirm('¿Seguro que quieres borrar esta ruta?')) return; saveRoutes(getRoutes().filter(r=>r.id!==id));}
function mergeRoutes(localRoutes, remoteRoutes){const map=new Map(); [...(localRoutes||[]), ...(remoteRoutes||[])].forEach(r=>{if(!r||!r.id)return; const old=map.get(r.id); if(!old || new Date(r.updatedAt||0)>new Date(old.updatedAt||0)) map.set(r.id,r);}); return Array.from(map.values()).sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')) || String(a.codigo||'').localeCompare(String(b.codigo||'')));}
