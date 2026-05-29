const FIREBASE_DB_URL = 'https://registro-rutas-b3d66-default-rtdb.europe-west1.firebasedatabase.app';
const SYNC_ROOT = 'rutas_maria_jesus_v1';
const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000;

function getSyncConfig(){return readJSON(STORE.SYNC,{peerId:'',dbUrl:FIREBASE_DB_URL,lastSync:'',status:'Sin configurar'});}
function saveSyncConfig(cfg){writeJSON(STORE.SYNC,{...getSyncConfig(),...cfg,dbUrl:FIREBASE_DB_URL}); loadSyncForm();}
function loadSyncForm(){const s=getSyncConfig(); if(syncDeviceId)syncDeviceId.value=getDeviceId(); if(syncPeerId)syncPeerId.value=s.peerId||''; if(syncDbUrl){syncDbUrl.value=FIREBASE_DB_URL; syncDbUrl.readOnly=true;} if(syncStatus)syncStatus.value=navigator.onLine?(s.status||'Online'):'Sin conexión'; if(syncLast)syncLast.value=s.lastSync?formatDateTime(s.lastSync):'Nunca';}
function firebaseBase(){return FIREBASE_DB_URL.replace(/\/$/,'') + '/' + SYNC_ROOT;}
function pairKey(){const s=getSyncConfig(); if(!s.peerId)return null; return [getDeviceId(),s.peerId].sort().join('_');}
function pairPath(){const key=pairKey(); return key ? firebaseBase() + '/pairs/' + encodeURIComponent(key) + '.json' : null;}
function devicePath(deviceId=getDeviceId()){return firebaseBase() + '/devices/' + encodeURIComponent(deviceId) + '.json';}
function logSync(msg){if(syncLog)syncLog.textContent='['+new Date().toLocaleTimeString('es-ES')+'] '+msg+'\n'+syncLog.textContent;}

async function putJSON(url,payload){const res=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!res.ok)throw new Error('Firebase respondió: '+res.status); return res;}
async function getJSON(url){const res=await fetch(url,{cache:'no-store'}); if(!res.ok)throw new Error('Firebase respondió: '+res.status); return await res.json();}

async function pairDevice(){
  const peer=syncPeerId.value.trim().toUpperCase();
  if(!peer){alert('Introduce el ID del otro dispositivo.');return;}
  if(peer===getDeviceId()){alert('El ID del otro dispositivo no puede ser igual al ID de este dispositivo.');return;}
  saveSyncConfig({peerId:peer,status:'Emparejado'});
  logSync('Dispositivo emparejado localmente: '+peer);
  if(navigator.onLine){
    try{
      await putJSON(pairPath(),{devices:[getDeviceId(),peer],createdAt:nowISO(),updatedAt:nowISO()});
      await putJSON(devicePath(),{deviceId:getDeviceId(),peerId:peer,lastSeen:nowISO(),routes:getAllRoutes()});
      logSync('Emparejamiento guardado en Firebase.');
    }catch(e){logSync('No se pudo guardar el emparejamiento en Firebase: '+e.message);}
  }
  alert('Emparejamiento guardado. A partir de ahora puedes sincronizar automáticamente con ese dispositivo.');
}

async function syncNow(auto=false){
  const s=getSyncConfig();
  const peer=s.peerId;
  if(!peer){if(!auto)alert('Primero introduce el ID del otro dispositivo y pulsa EMPAREJAR.'); return;}
  if(!navigator.onLine){saveSyncConfig({status:'Sin conexión'}); logSync('Sin internet. Se mantiene la copia local.'); return;}
  try{
    loadSyncForm();
    logSync('Sincronizando...');
    const remoteDevice=await getJSON(devicePath(peer));
    const remoteRoutes=remoteDevice?.routes||[];
    const merged=mergeRoutes(getAllRoutes(), remoteRoutes);
    saveRoutes(merged);
    const payload={deviceId:getDeviceId(),peerId:peer,lastSeen:nowISO(),updatedAt:nowISO(),routes:merged};
    await putJSON(devicePath(),payload);
    await putJSON(pairPath(),{devices:[getDeviceId(),peer].sort(),updatedAt:nowISO(),lastSyncBy:getDeviceId()});
    saveSyncConfig({lastSync:nowISO(),status:'Sincronizado'});
    const visibles=merged.filter(r=>!r._deleted).length;
    logSync('Sincronización completada. Rutas visibles: '+visibles+'. Total técnico: '+merged.length+'.');
  }catch(e){
    saveSyncConfig({status:'Error'});
    logSync('Error de sincronización: '+e.message);
    if(!auto)alert('No se pudo sincronizar. Revisa que el otro dispositivo ya haya emparejado o sincronizado al menos una vez, y que las reglas de Firebase permitan lectura/escritura.');
  }
}

function autoSyncOnStart(){setTimeout(()=>syncNow(true),900); setInterval(()=>syncNow(true),AUTO_SYNC_INTERVAL_MS);}
window.addEventListener('online',()=>{loadSyncForm(); syncNow(true);});
window.addEventListener('offline',loadSyncForm);
