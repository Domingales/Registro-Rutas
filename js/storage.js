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

function getAllRoutes(){return readJSON(STORE.ROUTES, []);}
function getRoutes(){return getAllRoutes().filter(r=>!r._deleted);}
function saveRoutes(routes){writeJSON(STORE.ROUTES, routes || []); window.dispatchEvent(new Event('routesChanged'));}
function nextCode(){const nums=getRoutes().map(r=>parseInt(String(r.codigo||'').replace(/\D/g,''),10)).filter(Boolean); const n=(nums.length?Math.max(...nums):0)+1; return String(n).padStart(4,'0');}

function upsertRoute(route){
  const routes=getAllRoutes();
  const i=routes.findIndex(r=>r.id===route.id);
  const stamp=nowISO();
  route._deleted=false;
  if(i>=0){
    route.createdAt=routes[i].createdAt||stamp;
    route.updatedAt=stamp;
    route.deviceId=getDeviceId();
    delete route.deletedAt;
    delete route.deletedBy;
    routes[i]=route;
  }else{
    route.id=route.id||uid('RUTA');
    route.codigo=route.codigo||nextCode();
    route.createdAt=stamp;
    route.updatedAt=stamp;
    route.deviceId=getDeviceId();
    routes.push(route);
  }
  saveRoutes(routes);
  return route;
}

function deleteRoute(id){
  if(!confirm('¿Seguro que quieres borrar esta ruta?')) return;
  const routes=getAllRoutes();
  const i=routes.findIndex(r=>r.id===id);
  if(i<0)return;
  const stamp=nowISO();
  routes[i]={...routes[i],_deleted:true,deletedAt:stamp,deletedBy:getDeviceId(),updatedAt:stamp};
  saveRoutes(routes);
  if(typeof syncNow==='function')syncNow(true);
}

function routeStamp(r){return new Date(r?.updatedAt || r?.deletedAt || r?.createdAt || 0).getTime() || 0;}
function mergeRoutes(localRoutes, remoteRoutes){
  const map=new Map();
  [...(localRoutes||[]), ...(remoteRoutes||[])].forEach(r=>{
    if(!r||!r.id)return;
    const old=map.get(r.id);
    if(!old || routeStamp(r)>=routeStamp(old)) map.set(r.id,r);
  });
  return Array.from(map.values()).sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')) || String(a.codigo||'').localeCompare(String(b.codigo||'')));
}
