const FIELDS=['routeId','codigo','fecha','nombre','origen','destino','localidad','empresa','vehiculo','tipoServicio','importeServicio','kmTotales','duracion','horaSalida','carreteras','peajes','importePeajes','tipoCarretera','dificultad','recomendable','valoracion','estado','gastosGrupoPagados','sitioComida','valoracionComida','gastoViajeImporte','gastoViajeConcepto','gastoViajePagadoPor','gasoilSiNo','gasoilLugar','gasoilImporte','gasoilLitros','limpiezaFinServicio','notasServicio','itinerario','gasolineras','descansos','restaurantes','aparcamientos','paradas','interes','talleres','avisos','alternativa','consejos','notas'];
function $(id){return document.getElementById(id);}
function closeMenu(){sideMenu.classList.remove('open'); overlay.classList.remove('show'); sideMenu.setAttribute('aria-hidden','true');}
function openMenu(){sideMenu.classList.add('open'); overlay.classList.add('show'); sideMenu.setAttribute('aria-hidden','false');}
function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); $('view-'+name).classList.add('active'); closeMenu(); if(name==='list')renderList(); if(name==='accounting')renderAccounting(); if(name==='config')loadConfigForm(); if(name==='sync')loadSyncForm(); if(name==='add'&&!routeId.value)prepareNewRoute();}
function prepareNewRoute(){routeForm.reset(); routeId.value=''; codigo.value=nextCode(); fecha.value=new Date().toISOString().slice(0,10); formTitle.textContent='Añadir ruta';}
function formToRoute(){const r={}; FIELDS.forEach(id=>{if(id==='routeId')return; const el=$(id); if(el)r[id]=el.value;}); r.id=routeId.value||uid('RUTA'); r.codigo=codigo.value||nextCode(); return r;}
function routeToForm(r){FIELDS.forEach(id=>{const el=$(id); if(!el)return; if(id==='routeId')el.value=r.id||''; else el.value=r[id]??'';}); formTitle.textContent='Editar ruta '+(r.codigo||'');}
function editRoute(id){const r=getRoutes().find(x=>x.id===id); if(!r)return; routeToForm(r); showView('add');}

function syncAccountingFromRoute(route){
  if(typeof upsertAccounting!=='function')return;
  const entries=getAllAccounting();
  const makeEntry=(kind,tipo,concepto,importe,observaciones)=>{
    const amount=parseFloat(importe)||0;
    const old=entries.find(e=>e.sourceRouteId===route.id && e.sourceKind===kind && !e._deleted);
    if(amount<=0){
      if(old)deleteAccountingSilent(old.id);
      return;
    }
    upsertAccounting({
      id:old?.id||uid('CONT'),
      fecha:route.fecha||new Date().toISOString().slice(0,10),
      tipo,
      concepto,
      ruta:[route.codigo,route.nombre].filter(Boolean).join(' · '),
      importeDia:amount,
      importePago:0,
      observaciones,
      sourceRouteId:route.id,
      sourceKind:kind
    });
  };
  makeEntry('servicio','trabajo','Servicio a cobrar',route.importeServicio,`Registro creado desde la ruta ${route.codigo||''}. Vehículo: ${route.vehiculo||''}. Tipo: ${route.tipoServicio||''}.`);
  makeEntry('gastoViaje','gasto',route.gastoViajeConcepto||'Gasto del viaje a abonar',route.gastoViajeImporte,`Pagado por: ${route.gastoViajePagadoPor||''}. Grupo con gastos pagados: ${route.gastosGrupoPagados||'No'}. Comida: ${route.sitioComida||''}.`);
  makeEntry('gasoil','gasoil','Gasoil a abonar',route.gasoilImporte,`Lugar: ${route.gasoilLugar||''}. Litros: ${route.gasoilLitros||''}. Vehículo: ${route.vehiculo||''}.`);
}
function deleteAccountingSilent(id){
  const entries=getAllAccounting();
  const i=entries.findIndex(e=>e.id===id);
  if(i<0)return;
  const stamp=nowISO();
  entries[i]={...entries[i],_deleted:true,deletedAt:stamp,deletedBy:getDeviceId(),updatedAt:stamp};
  saveAccounting(entries);
}
function handleSubmit(e){e.preventDefault(); const saved=upsertRoute(formToRoute()); syncAccountingFromRoute(saved); alert('Ruta guardada correctamente. Se han creado o actualizado los apuntes contables automáticos si había importes.'); prepareNewRoute(); renderList(); if(typeof renderAccounting==='function')renderAccounting(); showView('list'); syncNow(true);}
function bindEvents(){hamburgerBtn.onclick=openMenu; closeMenuBtn.onclick=closeMenu; overlay.onclick=closeMenu; document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view))); routeForm.addEventListener('submit',handleSubmit); clearFormBtn.onclick=prepareNewRoute; document.querySelectorAll('.filters input,.filters select').forEach(el=>el.addEventListener('input',renderList)); printFilteredBtn.onclick=printFiltered; copyExcelBtn.onclick=copyExcel; clearFiltersBtn.onclick=clearFilters; saveConfigBtn.onclick=saveConfigFromForm; resetConfigBtn.onclick=resetConfig; pairBtn.onclick=pairDevice; syncNowBtn.onclick=()=>syncNow(false); exportJsonBtn.onclick=downloadJSON; copyJsonBtn.onclick=copyJSON; restorePastedBtn.onclick=restoreFromText; importFileBtn.onclick=()=>importFileInput.click(); importFileInput.onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);}; window.addEventListener('routesChanged',()=>{renderList();updateKpis();}); if(typeof bindAccountingEvents==='function')bindAccountingEvents();}
function init(){applyConfig(); bindEvents(); prepareNewRoute(); renderList(); if(typeof renderAccounting==='function')renderAccounting(); loadSyncForm(); autoSyncOnStart();}
document.addEventListener('DOMContentLoaded',init);
