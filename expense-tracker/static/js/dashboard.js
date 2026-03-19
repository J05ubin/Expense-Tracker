// ── State ─────────────────────────────────────────────────────────────────────
let allTx     = [];
let editingId = null;
let pieChart  = null;
let currentMonth = new Date().toISOString().slice(0,7); // YYYY-MM

// ── Category icons & colors ───────────────────────────────────────────────────
const CAT_ICON = {
  Food:'🍔', Transport:'🚌', Shopping:'🛍️', Bills:'💡', Health:'💊',
  Education:'📚', Entertainment:'🎮', Salary:'💼', Freelance:'💻',
  Gift:'🎁', Investment:'📈', Other:'📦'
};
const CAT_COLOR = {
  Food:'#ff6b6b', Transport:'#ffd166', Shopping:'#f78fb3', Bills:'#778ca3',
  Health:'#ff5252', Education:'#54a0ff', Entertainment:'#5f27cd',
  Salary:'#00e676', Freelance:'#26de81', Gift:'#fd9644', Investment:'#00cec9', Other:'#b2bec3'
};
const CAT_BG = {
  Food:'rgba(255,107,107,.12)', Transport:'rgba(255,209,102,.12)',
  Shopping:'rgba(247,143,179,.12)', Bills:'rgba(119,140,163,.12)',
  Health:'rgba(255,82,82,.12)', Education:'rgba(84,160,255,.12)',
  Entertainment:'rgba(95,39,205,.12)', Salary:'rgba(0,230,118,.12)',
  Freelance:'rgba(38,222,129,.12)', Gift:'rgba(253,150,68,.12)',
  Investment:'rgba(0,206,201,.12)', Other:'rgba(178,190,195,.12)'
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form       = document.getElementById('expense-form');
const submitBtn  = document.getElementById('submit-btn');
const cancelBtn  = document.getElementById('cancel-btn');
const formError  = document.getElementById('form-error');
const formMode   = document.getElementById('form-mode');
const formTitle  = document.getElementById('form-title');
const txList     = document.getElementById('tx-list');
const txLoader   = document.getElementById('tx-loader');
const txEmpty    = document.getElementById('tx-empty');
const txCount    = document.getElementById('tx-count');
const searchInp  = document.getElementById('search');
const filterType = document.getElementById('filter-type');
const filterCat  = document.getElementById('filter-cat');

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, err=false){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = (err?'error ':')+'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.className='', 3200);
}

// ── Month picker ──────────────────────────────────────────────────────────────
function buildMonthPicker(){
  const sel = document.getElementById('month-picker');
  const now = new Date();
  for(let i=0;i<12;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const val = d.toISOString().slice(0,7);
    const label = d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    if(val===currentMonth) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', e => { currentMonth = e.target.value; refresh(); });
}

// ── Format ────────────────────────────────────────────────────────────────────
function fmt(n){ return '₹' + Number(n).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function fmtDate(s){ return new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── API ───────────────────────────────────────────────────────────────────────
async function api(url, opts={}){
  const res = await fetch(url,{headers:{'Content-Type':'application/json'},...opts});
  const data = await res.json();
  if(!res.ok) throw new Error(data.error||'Server error');
  return data;
}

// ── Load user name ────────────────────────────────────────────────────────────
async function loadMe(){
  try{
    const d = await api('/api/me');
    document.getElementById('user-name').textContent = d.name ? `👋 ${d.name}` : '';
  }catch{}
}

// ── Load transactions ─────────────────────────────────────────────────────────
async function loadTx(){
  txLoader.style.display='flex'; txList.style.display='none'; txEmpty.style.display='none';
  try{
    const params = new URLSearchParams({month: currentMonth});
    const s=searchInp.value.trim(); if(s) params.set('search',s);
    const t=filterType.value; if(t) params.set('type',t);
    const c=filterCat.value; if(c) params.set('category',c);
    allTx = await api('/api/expenses?'+params.toString());
    renderTx();
  }catch(e){
    txLoader.innerHTML=`<span style="color:var(--red)">⚠️ ${e.message}</span>`;
  }
}

function renderTx(){
  txLoader.style.display='none';
  txCount.textContent = allTx.length + (allTx.length===1?' record':' records');
  if(allTx.length===0){ txList.style.display='none'; txEmpty.style.display='block'; return; }
  txEmpty.style.display='none'; txList.style.display='block';
  txList.innerHTML = allTx.map(tx=>`
    <div class="tx-item">
      <div class="tx-cat-icon" style="background:${CAT_BG[tx.category]||'rgba(255,255,255,.05)'}">
        ${CAT_ICON[tx.category]||'📦'}
      </div>
      <div class="tx-info">
        <div class="tx-title">${esc(tx.title)}</div>
        <div class="tx-meta">${esc(tx.category)} • ${fmtDate(tx.date)}${tx.note?` • ${esc(tx.note)}`:''}</div>
      </div>
      <div class="tx-amount ${tx.type}">${tx.type==='expense'?'−':'+'}${fmt(tx.amount)}</div>
      <div class="tx-actions">
        <button class="btn btn-edit-tx" onclick="startEdit('${tx._id}')">✏️</button>
        <button class="btn btn-del-tx"  onclick="deleteTx('${tx._id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ── Load summary + chart ──────────────────────────────────────────────────────
async function loadSummary(){
  try{
    const d = await api('/api/summary?month='+currentMonth);
    document.getElementById('total-income').textContent  = fmt(d.total_income);
    document.getElementById('total-expense').textContent = fmt(d.total_expense);
    const balEl = document.getElementById('balance');
    balEl.textContent = fmt(d.balance);
    balEl.style.color = d.balance>=0 ? 'var(--green)' : 'var(--red)';
    renderChart(d.by_category);
  }catch{}
}

function renderChart(byCat){
  const wrap   = document.querySelector('.chart-wrap');
  const empty  = document.getElementById('chart-empty');
  const canvas = document.getElementById('pie-chart');
  const labels = Object.keys(byCat);
  if(!labels.length){ canvas.style.display='none'; empty.style.display='block'; return; }
  canvas.style.display='block'; empty.style.display='none';
  const values = labels.map(k=>byCat[k]);
  const colors = labels.map(k=>CAT_COLOR[k]||'#b2bec3');
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(canvas,{
    type:'doughnut',
    data:{labels, datasets:[{data:values, backgroundColor:colors, borderColor:'#111318', borderWidth:3, hoverOffset:6}]},
    options:{
      responsive:true, cutout:'62%',
      plugins:{
        legend:{position:'bottom',labels:{color:'#6c7693',font:{size:11},padding:12,boxWidth:10}},
        tooltip:{callbacks:{label:ctx=>`${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`}}
      }
    }
  });
}

// ── Refresh all ───────────────────────────────────────────────────────────────
function refresh(){ loadTx(); loadSummary(); }

// ── Type toggle ───────────────────────────────────────────────────────────────
function setType(type){
  document.getElementById('type-val').value = type;
  document.querySelector('.expense-btn').classList.toggle('active', type==='expense');
  document.querySelector('.income-btn').classList.toggle('active', type==='income');
}

// ── Add / Update ──────────────────────────────────────────────────────────────
form.addEventListener('submit', async e=>{
  e.preventDefault();
  formError.style.display='none';
  submitBtn.disabled=true;
  submitBtn.textContent = editingId ? '💾 Saving…' : '⏳ Adding…';

  const payload = {
    title:    document.getElementById('f-title').value.trim(),
    amount:   document.getElementById('f-amount').value,
    category: document.getElementById('f-category').value,
    type:     document.getElementById('type-val').value,
    date:     document.getElementById('f-date').value,
    note:     document.getElementById('f-note').value.trim(),
  };

  try{
    if(editingId){
      await api('/api/expenses/'+editingId,{method:'PUT',body:JSON.stringify(payload)});
      toast('✅ Transaction updated!'); cancelEdit();
    }else{
      await api('/api/expenses',{method:'POST',body:JSON.stringify(payload)});
      toast('✅ Transaction added!'); form.reset(); setType('expense');
      document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
    }
    refresh();
  }catch(err){
    formError.textContent='⚠️ '+err.message; formError.style.display='block';
  }finally{
    submitBtn.disabled=false;
    submitBtn.textContent = editingId ? '💾 Update' : '➕ Add';
  }
});

// ── Edit ──────────────────────────────────────────────────────────────────────
function startEdit(id){
  const tx = allTx.find(t=>t._id===id); if(!tx) return;
  editingId=id;
  document.getElementById('f-title').value    = tx.title;
  document.getElementById('f-amount').value   = tx.amount;
  document.getElementById('f-category').value = tx.category;
  document.getElementById('f-date').value     = tx.date;
  document.getElementById('f-note').value     = tx.note||'';
  setType(tx.type);
  submitBtn.textContent='💾 Update'; cancelBtn.style.display='inline-flex';
  formMode.textContent='Editing'; formMode.style.background='rgba(255,215,64,.1)'; formMode.style.color='var(--gold)';
  formTitle.textContent='✏️ Edit Transaction'; formError.style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
  document.getElementById('f-title').focus();
}

function cancelEdit(){
  editingId=null; form.reset(); setType('expense');
  submitBtn.textContent='➕ Add'; cancelBtn.style.display='none';
  formMode.textContent='New'; formMode.style.background=''; formMode.style.color='';
  formTitle.textContent='➕ Add Transaction'; formError.style.display='none';
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteTx(id){
  if(!confirm('Delete this transaction?')) return;
  try{
    await api('/api/expenses/'+id,{method:'DELETE'});
    if(editingId===id) cancelEdit();
    toast('🗑️ Deleted.'); refresh();
  }catch(e){ toast('⚠️ '+e.message,true); }
}

// ── Search + filter ───────────────────────────────────────────────────────────
let debounce;
searchInp.addEventListener('input',()=>{ clearTimeout(debounce); debounce=setTimeout(loadTx,280); });
filterType.addEventListener('change',loadTx);
filterCat.addEventListener('change',loadTx);

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
buildMonthPicker();
loadMe();
refresh();
