
function eur(v){return (parseFloat(v)||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function accText(e){return Object.values(e).join(' ').toLowerCase();}
function formatAccountingDate(value){
  if(!value)return '';
  const parts=String(value).split('-');
  if(parts.length===3)return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return value;
}
function showAccountingToast(message){
  let toast=document.getElementById('accountingToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='accountingToast';
    toast.className='center-toast';
    document.body.appendChild(toast);
  }
  toast.textContent=message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(window.__accountingToastTimer);
  window.__accountingToastTimer=setTimeout(()=>toast.classList.remove('show'),3000);
}

function updateAccountingModeButtons(tipo){
  if(!addWorkDayBtn || !addPaymentBtn)return;
  addWorkDayBtn.classList.toggle('primary', tipo==='trabajo');
  addPaymentBtn.classList.toggle('primary', tipo==='pago');
  if(printAccountingBtn)printAccountingBtn.classList.remove('primary');
  if(copyAccountingExcelBtn)copyAccountingExcelBtn.classList.remove('primary');
}

function filteredAccounting(){
  const q=(accSearchText?.value||'').toLowerCase().trim();
  const desde=accDesde?.value||'';
  const hasta=accHasta?.value||'';
  const tipo=accFilterTipo?.value||'';
  return getAccounting().filter(e=>{
    if(q && !accText(e).includes(q))return false;
    if(desde && String(e.fecha||'')<desde)return false;
    if(hasta && String(e.fecha||'')>hasta)return false;
    if(tipo && e.tipo!==tipo)return false;
    return true;
  }).sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')) || accountingStamp(b)-accountingStamp(a));
}
function accountingTotals(rows=getAccounting()){
  const totalDias=rows.filter(e=>e.tipo==='trabajo').length;
  const totalACobrar=rows.reduce((s,e)=>s+(parseFloat(e.importeDia)||0),0);
  const totalCobrado=rows.reduce((s,e)=>s+(parseFloat(e.importePago)||0),0);
  const saldo=totalACobrar-totalCobrado;
  return {totalDias,totalACobrar,totalCobrado,saldo};
}
function renderAccounting(){
  if(!accountingRows)return;
  const rows=filteredAccounting();
  const allTotals=accountingTotals(getAccounting());
  const visibleTotals=accountingTotals(rows);
  const status=allTotals.saldo>0.009?'PENDIENTE DE COBRAR':(allTotals.saldo<-0.009?'COBRADO DE MÁS':'CUADRADO');
  accountingSummary.innerHTML=`
    <div class="acc-kpi"><span>Días trabajados</span><strong>${allTotals.totalDias}</strong></div>
    <div class="acc-kpi"><span>Total generado</span><strong>${eur(allTotals.totalACobrar)}</strong></div>
    <div class="acc-kpi"><span>Total cobrado</span><strong>${eur(allTotals.totalCobrado)}</strong></div>
    <div class="acc-kpi ${allTotals.saldo>0?'pending':allTotals.saldo<0?'overpaid':'ok'}"><span>Saldo</span><strong>${eur(Math.abs(allTotals.saldo))}</strong><em>${status}</em></div>
    <div class="acc-kpi"><span>Visible según filtros</span><strong>${rows.length}</strong><em>${eur(visibleTotals.totalACobrar)} / ${eur(visibleTotals.totalCobrado)}</em></div>`;
  accountingRows.innerHTML=rows.length?rows.map(e=>{
    const line=(parseFloat(e.importeDia)||0)-(parseFloat(e.importePago)||0);
    return `<tr>
      <td>${esc(formatAccountingDate(e.fecha))}</td>
      <td><span class="tag">${e.tipo==='pago'?'Pago recibido':'Día trabajado'}</span></td>
      <td>${esc(e.concepto)}</td>
      <td>${esc(e.ruta)}</td>
      <td class="num">${eur(e.importeDia)}</td>
      <td class="num">${eur(e.importePago)}</td>
      <td class="num ${line>0?'pending-text':line<0?'overpaid-text':'ok-text'}">${line<0?'-':''}${eur(Math.abs(line))}</td>
      <td>${esc(e.observaciones)}</td>
      <td class="actions no-print"><button onclick="editAccounting('${e.id}')">✏️</button><button onclick="deleteAccounting('${e.id}')">🗑️</button></td>
    </tr>`;
  }).join(''):'<tr><td colspan="9">No hay registros contables que coincidan con los filtros.</td></tr>';
}
function prepareAccountingForm(tipo='trabajo'){
  if(!accountingForm)return;
  accountingForm.reset();
  accId.value='';
  accFecha.value=new Date().toISOString().slice(0,10);
  accTipo.value=tipo;
  updateAccountingModeButtons(tipo);
  if(tipo==='trabajo'){
    accConcepto.value='Día trabajado';
    accImportePago.value='';
  }else{
    accConcepto.value='Pago recibido';
    accImporteDia.value='';
  }
}
function accountingFormToEntry(){
  return {id:accId.value||uid('CONT'),fecha:accFecha.value,tipo:accTipo.value,concepto:accConcepto.value,ruta:accRuta.value,importeDia:accImporteDia.value,importePago:accImportePago.value,observaciones:accObservaciones.value};
}
function accountingEntryToForm(e){
  accId.value=e.id||''; accFecha.value=e.fecha||''; accTipo.value=e.tipo||'trabajo'; updateAccountingModeButtons(accTipo.value); accConcepto.value=e.concepto||''; accRuta.value=e.ruta||''; accImporteDia.value=e.importeDia||''; accImportePago.value=e.importePago||''; accObservaciones.value=e.observaciones||'';
  accountingForm.scrollIntoView({behavior:'smooth',block:'start'});
}
function editAccounting(id){const e=getAccounting().find(x=>x.id===id); if(e)accountingEntryToForm(e);}
function saveAccountingForm(e){
  e.preventDefault();
  upsertAccounting(accountingFormToEntry());
  showAccountingToast('Registro contable guardado correctamente');
  prepareAccountingForm(accTipo.value||'trabajo');
  renderAccounting();
  syncNow(true);
}
function clearAccountingFilters(){['accSearchText','accDesde','accHasta','accFilterTipo'].forEach(id=>{const el=document.getElementById(id); if(el)el.value='';}); renderAccounting();}
function printAccounting(){renderAccounting(); setPrintTarget('view-accounting'); window.print();}
function copyAccountingExcel(){
  const rows=filteredAccounting();
  const heads=['Fecha','Tipo','Concepto','Ruta/Servicio','Importe a cobrar','Importe cobrado','Saldo línea','Observaciones','Actualizado'];
  const lines=[heads.join('\t')];
  rows.forEach(e=>{
    const line=(parseFloat(e.importeDia)||0)-(parseFloat(e.importePago)||0);
    lines.push([e.fecha,e.tipo==='pago'?'Pago recibido':'Día trabajado',e.concepto,e.ruta,(parseFloat(e.importeDia)||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),(parseFloat(e.importePago)||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),line.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),e.observaciones,formatDateTime(e.updatedAt)].map(v=>String(v??'').replace(/\n/g,' | ')).join('\t'));
  });
  navigator.clipboard.writeText(lines.join('\n')).then(()=>alert('Contabilidad copiada para Excel.'));
}
function bindAccountingEvents(){
  if(!accountingForm)return;
  addWorkDayBtn.onclick=()=>prepareAccountingForm('trabajo');
  addPaymentBtn.onclick=()=>prepareAccountingForm('pago');
  accountingForm.addEventListener('submit',saveAccountingForm);
  cancelAccountingEditBtn.onclick=()=>prepareAccountingForm(accTipo.value||'trabajo');
  printAccountingBtn.onclick=printAccounting;
  copyAccountingExcelBtn.onclick=copyAccountingExcel;
  clearAccountingFiltersBtn.onclick=clearAccountingFilters;
  document.querySelectorAll('.accounting-filters input,.accounting-filters select').forEach(el=>el.addEventListener('input',renderAccounting));
  accTipo.addEventListener('change',()=>updateAccountingModeButtons(accTipo.value));
  window.addEventListener('accountingChanged',renderAccounting);
  prepareAccountingForm('trabajo');
  renderAccounting();
}
