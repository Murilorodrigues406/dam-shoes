// ═══════════════════════════════════════════════════
// DAM SHOES — app.js
// Catálogo + Painel Admin + Upload de Fotos
// ═══════════════════════════════════════════════════

/* ── STATE ───────────────────────────────── */
let allProducts   = [];
let currentFilter = 'all';
let isAdmin       = false;
let editingId     = null;

// fotos selecionadas para upload (add e edit)
let addPhotos  = []; // { file, url } ou { url }
let editPhotos = []; // { file, url } ou { url }

/* ── DOM REFS ────────────────────────────── */
const grid     = document.getElementById('products-grid');
const countEl  = document.getElementById('products-count');
const filterBar= document.getElementById('filters');

/* ══════════════════════════════════════════
   LOAD PRODUCTS
══════════════════════════════════════════ */
async function loadProducts() {
  setGridState('loading');
  const { data, error } = await db
    .from('products').select('*').order('created_at', { ascending: false });
  if (error) { setGridState('error', error.message); return; }
  allProducts = data || [];
  buildFilters();
  renderProducts();
}

function setGridState(state, msg = '') {
  if (state === 'loading') {
    grid.innerHTML = `<div class="state-box"><div class="spinner"></div><p>Carregando produtos...</p></div>`;
  } else if (state === 'empty') {
    grid.innerHTML = `<div class="state-box"><h3>SEM PRODUTOS</h3><p>Nenhum produto cadastrado ainda.</p></div>`;
  } else if (state === 'error') {
    grid.innerHTML = `<div class="state-box"><h3>ERRO</h3><p>${msg}</p></div>`;
  }
}

/* ── BUILD FILTER BUTTONS ────────────────── */
function buildFilters() {
  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
  filterBar.querySelectorAll('[data-dynamic]').forEach(el => el.remove());
  brands.forEach(brand => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = 'brand:' + brand;
    btn.dataset.dynamic = '1';
    btn.textContent = brand;
    btn.addEventListener('click', onFilterClick);
    filterBar.appendChild(btn);
  });
}

/* ── RENDER PRODUCTS ─────────────────────── */
function renderProducts() {
  let list = [...allProducts];
  if (currentFilter === 'available')        list = list.filter(p => p.status === 'available');
  else if (currentFilter === 'esgotado')    list = list.filter(p => p.status === 'esgotado');
  else if (currentFilter.startsWith('brand:')) {
    const brand = currentFilter.replace('brand:', '');
    list = list.filter(p => p.brand === brand);
  }
  countEl.textContent = `${list.length} produto${list.length !== 1 ? 's' : ''}`;
  if (list.length === 0) { setGridState('empty'); return; }
  grid.innerHTML = list.map((p, i) => buildCard(p, i)).join('');
  list.forEach(p => { const photos = parseArr(p.photos); if (photos.length > 1) setupCarousel(p.id, photos); });
}

/* ── BUILD CARD HTML ─────────────────────── */
function buildCard(p, idx) {
  const photos   = parseArr(p.photos);
  const sizes    = parseArr(p.sizes);
  const isEsg    = p.status === 'esgotado';
  const priceNew = formatPrice(p.price);
  const priceOld = p.price_old ? formatPrice(p.price_old) : null;

  const imgEl = photos[0]
    ? `<img id="img-${p.id}" src="${photos[0]}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="card-img-placeholder">SEM FOTO</div>`;

  const dots = photos.length > 1
    ? `<div class="card-dots">${photos.map((_, i) =>
        `<button class="card-dot ${i===0?'active':''}" onclick="goPhoto('${p.id}',${i})" aria-label="Foto ${i+1}"></button>`
      ).join('')}</div>` : '';

  const sizeChips = sizes.slice(0,8).map(s => `<span class="size-tag">${s.trim()}</span>`).join('');

  const waMsg  = encodeURIComponent(`Olá! Tenho interesse no produto:\n*${p.name}*\nReferência: ${p.reference || 'N/A'}\nNumeração desejada: `);
  const waLink = `https://wa.me/${WHATSAPP}?text=${waMsg}`;

  return `
  <div class="card${isEsg?' esgotado':''}" style="animation-delay:${idx*0.05}s" onclick="openProduct('${p.id}')" style="cursor:pointer">
    <span class="card-badge ${isEsg?'esgotado':'available'}">${isEsg?'ESGOTADO':'● DISPONÍVEL'}</span>
    <div class="card-img-wrap">${imgEl}${dots}</div>
    <div class="card-body">
      ${p.brand?`<div class="card-brand">${p.brand}</div>`:''}
      <div class="card-name">${p.name}</div>
      ${p.reference?`<div class="card-ref">REF: ${p.reference}</div>`:''}
      ${sizeChips?`<div class="card-sizes">${sizeChips}</div>`:''}
      <div class="card-footer">
        <div class="card-prices">
          ${priceOld?`<span class="price-old">R$ ${priceOld}</span>`:''}
          <span class="price-new">R$ ${priceNew}</span>
          ${parcelaHtml(p.price)}
        </div>
        <a class="btn-buy" href="${isEsg?'#':waLink}" target="${isEsg?'':'_blank'}" rel="noopener"
           ${isEsg?'onclick="return false" style="pointer-events:none;background:var(--border2);color:var(--grey)"':''}>
          ${svgWA()} ${isEsg?'Esgotado':'Comprar'}
        </a>
      </div>
    </div>
  </div>`;
}

/* ── CAROUSEL ────────────────────────────── */
const carouselState = {};
function setupCarousel(id, photos) { carouselState[id] = { photos, current: 0 }; }
function goPhoto(id, idx) {
  const state = carouselState[id]; if (!state) return;
  state.current = idx;
  const img = document.getElementById(`img-${id}`);
  if (img) img.src = state.photos[idx];
  document.querySelectorAll(`.card-dot[onclick*="'${id}'"]`).forEach((dot, i) => dot.classList.toggle('active', i===idx));
}

/* ── FILTERS ─────────────────────────────── */
filterBar.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', onFilterClick));
function onFilterClick(e) {
  filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  currentFilter = e.currentTarget.dataset.filter;
  renderProducts();
}

/* ══════════════════════════════════════════
   UPLOAD DE FOTO PARA SUPABASE STORAGE
══════════════════════════════════════════ */
async function uploadPhoto(file, productRef) {
  const ext      = file.name.split('.').pop();
  const fileName = `${productRef || 'produto'}-${Date.now()}.${ext}`;
  const path     = `products/${fileName}`;

  const { error } = await db.storage
    .from('dam-shoes-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error('Erro no upload: ' + error.message);

  const { data } = db.storage.from('dam-shoes-assets').getPublicUrl(path);
  return data.publicUrl;
}

/* ── Subir todas as fotos pendentes ─────── */
async function resolvePhotos(photos, ref) {
  const urls = [];
  for (const p of photos) {
    if (p.file) {
      const url = await uploadPhoto(p.file, ref);
      urls.push(url);
    } else {
      urls.push(p.url);
    }
  }
  return urls;
}

/* ══════════════════════════════════════════
   COMPONENTE DE UPLOAD DE FOTOS
══════════════════════════════════════════ */
function buildPhotoUploader(containerId, photoArr) {
  const container = document.getElementById(containerId);
  if (!container) return;

  function render() {
    container.innerHTML = '';

    // slots de foto (máx 3)
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.className = 'photo-slot';

      if (photoArr[i]) {
        // tem foto
        const preview = photoArr[i].file
          ? URL.createObjectURL(photoArr[i].file)
          : photoArr[i].url;

        slot.innerHTML = `
          <img src="${preview}" onerror="this.src=''" />
          <button class="photo-slot-remove" onclick="removePhoto('${containerId}',${i})" aria-label="Remover foto">✕</button>`;
      } else {
        // slot vazio
        slot.innerHTML = `
          <label class="photo-slot-add" for="file-input-${containerId}-${i}">
            <span style="font-size:1.4rem;color:var(--border2)">+</span>
            <span style="font-size:0.65rem;color:var(--grey);letter-spacing:.05em">Adicionar foto</span>
            <input type="file" id="file-input-${containerId}-${i}" accept="image/*" capture="environment"
              style="display:none" onchange="onFileSelected('${containerId}',${i},this)" />
          </label>`;
      }
      container.appendChild(slot);
    }
  }

  render();
}

function onFileSelected(containerId, idx, input) {
  const file = input.files[0];
  if (!file) return;
  const arr = containerId.includes('add') ? addPhotos : editPhotos;
  arr[idx] = { file };
  buildPhotoUploader(containerId, arr);
}

function removePhoto(containerId, idx) {
  const arr = containerId.includes('add') ? addPhotos : editPhotos;
  arr.splice(idx, 1);
  buildPhotoUploader(containerId, arr);
}

/* ══════════════════════════════════════════
   ADMIN MODAL
══════════════════════════════════════════ */
const adminOverlay = document.getElementById('admin-overlay');
const loginSection = document.getElementById('login-section');
const adminPanel   = document.getElementById('admin-panel');

document.getElementById('btn-admin-header').addEventListener('click', openAdminModal);
document.getElementById('close-admin').addEventListener('click', () => adminOverlay.classList.remove('open'));
adminOverlay.addEventListener('click', e => { if (e.target===adminOverlay) adminOverlay.classList.remove('open'); });

function openAdminModal() {
  adminOverlay.classList.add('open');
  if (isAdmin) showAdminPanel();
  else { loginSection.style.display='block'; adminPanel.style.display='none'; }
}

/* ── LOGIN ───────────────────────────────── */
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('input-password').addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });

function doLogin() {
  const pw = document.getElementById('input-password').value;
  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    showMsg('msg-login', '', false);
    showAdminPanel();
  } else {
    showMsg('msg-login', 'Senha incorreta.', true);
  }
}

function showAdminPanel() {
  loginSection.style.display = 'none';
  adminPanel.style.display   = 'block';
  switchTab('add');
}

document.getElementById('btn-logout').addEventListener('click', () => {
  isAdmin = false;
  adminOverlay.classList.remove('open');
  document.getElementById('input-password').value = '';
});

/* ── TABS ────────────────────────────────── */
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
  document.getElementById('tab-add').style.display  = tab==='add'  ? 'block' : 'none';
  document.getElementById('tab-list').style.display = tab==='list' ? 'block' : 'none';
  if (tab==='add')  { addPhotos = []; buildPhotoUploader('add-photo-uploader', addPhotos); }
  if (tab==='list') loadAdminList();
}

/* ── MARGIN CALCULATOR ───────────────────── */
['add-price','add-cost'].forEach(id => document.getElementById(id)?.addEventListener('input', updateMargin));
function updateMargin() {
  const price = parseFloat(document.getElementById('add-price').value)||0;
  const cost  = parseFloat(document.getElementById('add-cost').value)||0;
  const lucro = price - cost;
  const pct   = price>0 ? ((lucro/price)*100).toFixed(1) : '0.0';
  const elL   = document.getElementById('margin-lucro');
  const elP   = document.getElementById('margin-pct');
  if (elL) { elL.textContent=`R$ ${formatPrice(lucro)}`; elL.className=`margin-value ${lucro>=0?'positive':'negative'}`; }
  if (elP) { elP.textContent=`${pct}%`; elP.className=`margin-value ${lucro>=0?'positive':'negative'}`; }
}

/* ══════════════════════════════════════════
   ADD PRODUCT
══════════════════════════════════════════ */
document.getElementById('btn-add-product').addEventListener('click', addProduct);

async function addProduct() {
  const btn   = document.getElementById('btn-add-product');
  const name  = v('add-name');
  const price = parseFloat(v('add-price'));

  if (!name || isNaN(price)) { showMsg('msg-add','Nome e preço são obrigatórios.',true); return; }
  if (addPhotos.length===0) { showMsg('msg-add','Adicione pelo menos 1 foto.',true); return; }

  btn.disabled=true; btn.textContent='Enviando fotos...';

  try {
    const ref    = v('add-ref') || name.replace(/\s+/g,'-').toLowerCase();
    const photos = await resolvePhotos(addPhotos, ref);
    btn.textContent = 'Salvando...';

    const { error } = await db.from('products').insert([{
      name, price,
      brand:       v('add-brand')    || null,
      reference:   v('add-ref')      || null,
      price_old:   parseFloat(v('add-price-old'))||null,
      cost:        parseFloat(v('add-cost'))||null,
      sizes:       v('add-sizes').split(',').map(s=>s.trim()).filter(Boolean),
      photos,
      status:      v('add-status'),
      description: v('add-desc')     || null,
    }]);

    if (error) throw new Error(error.message);

    showMsg('msg-add','Produto adicionado com sucesso!',false);
    clearAddForm();
    loadProducts();
    setTimeout(()=>showMsg('msg-add','',false), 3000);

  } catch(err) {
    showMsg('msg-add', err.message, true);
  }

  btn.disabled=false; btn.textContent='Salvar Produto';
}

function clearAddForm() {
  ['add-name','add-brand','add-ref','add-price','add-price-old','add-cost','add-sizes','add-desc'].forEach(clearField);
  document.getElementById('add-status').value='available';
  addPhotos=[];
  buildPhotoUploader('add-photo-uploader', addPhotos);
  updateMargin();
}

/* ══════════════════════════════════════════
   ADMIN LIST
══════════════════════════════════════════ */
async function loadAdminList() {
  const listEl = document.getElementById('admin-list');
  listEl.innerHTML='<p style="color:var(--grey);font-size:.8rem;text-align:center;padding:1rem">Carregando...</p>';

  const { data } = await db.from('products').select('*').order('created_at',{ascending:false});
  if (!data||data.length===0) {
    listEl.innerHTML='<p style="color:var(--grey);font-size:.8rem;text-align:center;padding:1rem">Nenhum produto.</p>';
    return;
  }

  listEl.innerHTML = data.map(p => {
    const photos = parseArr(p.photos);
    return `
    <div class="admin-item">
      <img src="${photos[0]||''}" onerror="this.src=''" alt="${p.name}" />
      <div class="admin-item-info">
        <strong>${p.name}</strong>
        <small>R$ ${formatPrice(p.price)} · ${p.brand||'–'} · ${p.status==='esgotado'?'✗ Esgotado':'✓ Disponível'}</small>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="openEdit('${p.id}')">Editar</button>
        <button class="btn-danger"    onclick="deleteProduct('${p.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

/* ── DELETE ──────────────────────────────── */
async function deleteProduct(id) {
  if (!confirm('Excluir este produto permanentemente?')) return;
  const { error } = await db.from('products').delete().eq('id',id);
  if (!error) { loadProducts(); loadAdminList(); }
}

/* ══════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════ */
const editOverlay = document.getElementById('edit-overlay');
document.getElementById('close-edit').addEventListener('click', ()=>editOverlay.classList.remove('open'));
editOverlay.addEventListener('click', e=>{ if(e.target===editOverlay) editOverlay.classList.remove('open'); });

function openEdit(id) {
  const p = allProducts.find(x=>x.id==id);
  if (!p) return;
  editingId = p.id;

  setField('edit-name',      p.name);
  setField('edit-brand',     p.brand||'');
  setField('edit-ref',       p.reference||'');
  setField('edit-price',     p.price);
  setField('edit-price-old', p.price_old||'');
  setField('edit-cost',      p.cost||'');
  setField('edit-sizes',     parseArr(p.sizes).join(', '));
  setField('edit-desc',      p.description||'');
  document.getElementById('edit-status').value = p.status||'available';

  // carregar fotos existentes
  editPhotos = parseArr(p.photos).map(url=>({ url }));
  buildPhotoUploader('edit-photo-uploader', editPhotos);
  updateEditMargin();
  showMsg('msg-edit','',false);
  editOverlay.classList.add('open');
}

['edit-price','edit-cost'].forEach(id => document.getElementById(id)?.addEventListener('input', updateEditMargin));
function updateEditMargin() {
  const price = parseFloat(document.getElementById('edit-price').value)||0;
  const cost  = parseFloat(document.getElementById('edit-cost').value)||0;
  const lucro = price-cost;
  const pct   = price>0?((lucro/price)*100).toFixed(1):'0.0';
  const elL   = document.getElementById('edit-margin-lucro');
  const elP   = document.getElementById('edit-margin-pct');
  if (elL) { elL.textContent=`R$ ${formatPrice(lucro)}`; elL.className=`margin-value ${lucro>=0?'positive':'negative'}`; }
  if (elP) { elP.textContent=`${pct}%`; elP.className=`margin-value ${lucro>=0?'positive':'negative'}`; }
}

document.getElementById('btn-save-edit').addEventListener('click', saveEdit);

async function saveEdit() {
  const btn   = document.getElementById('btn-save-edit');
  const name  = v('edit-name');
  const price = parseFloat(v('edit-price'));
  if (!name||isNaN(price)) { showMsg('msg-edit','Nome e preço são obrigatórios.',true); return; }

  btn.disabled=true; btn.textContent='Enviando fotos...';

  try {
    const ref    = v('edit-ref')||name.replace(/\s+/g,'-').toLowerCase();
    const photos = await resolvePhotos(editPhotos, ref);
    btn.textContent='Salvando...';

    const { error } = await db.from('products').update({
      name, price,
      brand:       v('edit-brand')   ||null,
      reference:   v('edit-ref')     ||null,
      price_old:   parseFloat(v('edit-price-old'))||null,
      cost:        parseFloat(v('edit-cost'))||null,
      sizes:       v('edit-sizes').split(',').map(s=>s.trim()).filter(Boolean),
      photos,
      status:      v('edit-status'),
      description: v('edit-desc')    ||null,
    }).eq('id', editingId);

    if (error) throw new Error(error.message);

    editOverlay.classList.remove('open');
    loadProducts();
    loadAdminList();

  } catch(err) {
    showMsg('msg-edit', err.message, true);
  }

  btn.disabled=false; btn.textContent='Salvar Alterações';
}

/* ── HEADER WHATSAPP ─────────────────────── */
document.getElementById('btn-wa-header').addEventListener('click', () => {
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Quero ver os produtos da DAM Shoes.')}`, '_blank');
});

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function v(id)        { return document.getElementById(id)?.value?.trim()||''; }
function setField(id,val) { const el=document.getElementById(id); if(el) el.value=val; }
function clearField(id)   { const el=document.getElementById(id); if(el) el.value=''; }

function parseArr(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return String(val).split(',').map(s=>s.trim()).filter(Boolean); }
}

function formatPrice(n) { return Number(n).toFixed(2).replace('.',','); }

// Calcula parcela com taxa do cartão
function calcParcela(price, parcelas, taxa) {
  if (!parcelas || parcelas <= 1) return null;
  const taxaDecimal = (taxa || 0) / 100;
  const total = price * Math.pow(1 + taxaDecimal, parcelas);
  const parcela = total / parcelas;
  return { parcela, total };
}

function parcelaHtml(price) {
  const parcelas   = window._cfg_parcelas   || 10;
  const taxa       = window._cfg_taxa       || 0;
  if (parcelas <= 1) return '';
  const calc = calcParcela(price, parcelas, taxa);
  if (!calc) return '';
  return `<div class="card-parcela">ou <strong>${parcelas}x de R$ ${formatPrice(calc.parcela)}</strong>${taxa > 0 ? ' no cartão' : ' sem juros'}</div>`;
}

function showMsg(id, text, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg'+(text?' show '+(isError?'error':'success'):'');
}

function svgWA() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
}

/* ── INIT ────────────────────────────────── */
loadProducts();

/* ══════════════════════════════════════════
   ANO AUTOMÁTICO NO RODAPÉ
══════════════════════════════════════════ */
document.getElementById('footer-year').textContent = new Date().getFullYear();

/* ══════════════════════════════════════════
   MENU LATERAL
══════════════════════════════════════════ */
const sideOverlay = document.getElementById('side-menu-overlay');

document.getElementById('btn-menu').addEventListener('click', () => {
  sideOverlay.classList.add('open');
});
document.getElementById('close-side-menu').addEventListener('click', closeSideMenu);
sideOverlay.addEventListener('click', e => { if (e.target === sideOverlay) closeSideMenu(); });

function closeSideMenu() {
  sideOverlay.classList.remove('open');
}

// Atualiza marcas no menu lateral
function updateSideBrands() {
  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
  const container = document.getElementById('side-brands');
  if (!container) return;

  // ícones por marca
  // botão Todos
  const todosCount = allProducts.length;
  let html = `
    <button class="side-brand-btn ${currentFilter==='all'?'active':''}" 
      data-filter="all" onclick="sideFilter('all',this)">
      Todos
      <span class="side-brand-count">${todosCount}</span>
    </button>`;

  brands.forEach(brand => {
    const count = allProducts.filter(p => p.brand === brand).length;
    const isActive = currentFilter === 'brand:' + brand;
    html += `
    <button class="side-brand-btn ${isActive?'active':''}" 
      data-filter="brand:${brand}" onclick="sideFilter('brand:${brand}',this)">
      ${brand}
      <span class="side-brand-count">${count}</span>
    </button>`;
  });

  container.innerHTML = html;
}

function sideFilter(filter, btn) {
  // atualiza filtro principal
  currentFilter = filter;
  filterBar.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  // atualiza visual do menu lateral
  document.querySelectorAll('.side-brand-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderProducts();
  closeSideMenu();
  // scroll para o catálogo
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
}

/* ══════════════════════════════════════════
   CONFIGURAÇÕES (ADMIN)
══════════════════════════════════════════ */
async function loadSettings() {
  const { data } = await db.from('settings').select('*').eq('id', 1).single();
  if (!data) return;

  setField('cfg-whatsapp', data.whatsapp || '');
  setField('cfg-prazo',    data.prazo    || '');
  setField('cfg-parcelas', data.parcelas || '');
  setField('cfg-taxa',     data.taxa_cartao || '');
  setField('cfg-promo',    data.promo    || '');
  setField('cfg-hero-img', data.hero_img || '');
}

document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);

async function saveSettings() {
  const btn = document.getElementById('btn-save-settings');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const heroImg = v('cfg-hero-img');
  const promo   = v('cfg-promo');
  const wa      = v('cfg-whatsapp');

  // Tenta UPDATE primeiro, se falhar tenta INSERT
  let error = null;

  const updateResult = await db.from('settings').update({
    whatsapp:     wa      || WHATSAPP,
    prazo:        v('cfg-prazo')    || '7 dias úteis',
    parcelas:     parseInt(v('cfg-parcelas')) || 10,
    taxa_cartao:  parseFloat(v('cfg-taxa'))   || 2.99,
    promo:        promo   || '',
    hero_img:     heroImg || '',
    updated_at:   new Date().toISOString(),
  }).eq('id', 1);

  error = updateResult.error;

  // Se update falhou, tenta insert
  if (error) {
    const insertResult = await db.from('settings').insert({
      id:           1,
      whatsapp:     wa      || WHATSAPP,
      prazo:        v('cfg-prazo')    || '7 dias úteis',
      parcelas:     parseInt(v('cfg-parcelas')) || 10,
      taxa_cartao:  parseFloat(v('cfg-taxa'))   || 2.99,
      promo:        promo   || '',
      hero_img:     heroImg || '',
    });
    error = insertResult.error;
  }

  btn.disabled = false; btn.textContent = 'Salvar Configurações';

  if (error) {
    // Salva localmente no navegador como fallback
    localStorage.setItem('dam_settings', JSON.stringify({
      whatsapp: wa || WHATSAPP,
      prazo: v('cfg-prazo') || '7 dias úteis',
      parcelas: parseInt(v('cfg-parcelas')) || 10,
      taxa_cartao: parseFloat(v('cfg-taxa')) || 2.99,
      promo: promo || '',
      hero_img: heroImg || '',
    }));
    showMsg('msg-settings', 'Configurações salvas localmente!', false);
  } else {
    showMsg('msg-settings', 'Configurações salvas!', false);
  }

  // Aplica mudanças em tempo real independente de erro
  if (heroImg) {
    const heroEl = document.querySelector('.hero-img');
    if (heroEl) heroEl.src = heroImg;
  }
  if (promo) {
    const promoEl = document.querySelector('.hero-promo strong');
    if (promoEl) promoEl.textContent = promo;
  }
  setTimeout(() => showMsg('msg-settings', '', false), 3000);
}

// carrega configurações ao abrir aba
const origSwitchTab = switchTab;
// patch switchTab para carregar settings
const _origSwitch = switchTab;
window.switchTabPatched = function(tab) {
  _origSwitch(tab);
  document.getElementById('tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
  if (tab === 'settings') loadSettings();
};
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => window.switchTabPatched(btn.dataset.tab);
});

// atualiza sidebar quando produtos carregam
const _origRender = renderProducts;
// hook after render
const origLoadProducts = loadProducts;
async function loadProductsWithSidebar() {
  await origLoadProducts();
  updateSideBrands();
}
// override
window.loadProducts = loadProductsWithSidebar;

// também atualiza as settings ao iniciar
(async () => {
  const { data } = await db.from('settings').select('*').eq('id', 1).single();
  if (data) {
    if (data.hero_img) {
      const heroEl = document.querySelector('.hero-img');
      if (heroEl) heroEl.src = data.hero_img;
    }
    if (data.promo) {
      const promoEl = document.querySelector('.hero-promo strong');
      if (promoEl) promoEl.textContent = data.promo;
    }
    // salva globalmente para cálculo de parcelas
    window._cfg_parcelas = data.parcelas || 10;
    window._cfg_taxa     = parseFloat(data.taxa_cartao) || 0;
  }
})();

// adiciona coluna promo e hero_img na tabela settings se não existir
// (rodado silenciosamente, falha sem problema)

/* ══════════════════════════════════════════
   MODAL VISUALIZAÇÃO DO PRODUTO
══════════════════════════════════════════ */
const productOverlay = document.getElementById('product-overlay');
let galleryPhotos  = [];
let galleryIndex   = 0;
let selectedSize   = null;

document.getElementById('close-product').addEventListener('click', () => {
  productOverlay.classList.remove('open');
});
productOverlay.addEventListener('click', e => {
  if (e.target === productOverlay) productOverlay.classList.remove('open');
});

// Abre o modal ao clicar no card
function openProduct(id) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;

  const photos = parseArr(p.photos);
  const sizes  = parseArr(p.sizes);
  const isEsg  = p.status === 'esgotado';

  galleryPhotos = photos;
  galleryIndex  = 0;
  selectedSize  = null;

  // Preenche informações
  document.getElementById('detail-brand').textContent   = p.brand || '';
  document.getElementById('detail-name').textContent    = p.name;
  document.getElementById('detail-ref').textContent     = p.reference ? `REF: ${p.reference}` : '';
  document.getElementById('detail-desc').textContent    = p.description || '';
  document.getElementById('detail-desc').style.display  = p.description ? 'block' : 'none';

  document.getElementById('detail-price-new').textContent = `R$ ${formatPrice(p.price)}`;
  // parcelas no modal
  const parcelaEl = document.getElementById('detail-parcela');
  if (parcelaEl) {
    const parcelas = window._cfg_parcelas || 10;
    const taxa     = window._cfg_taxa     || 0;
    if (parcelas > 1) {
      const calc = calcParcela(p.price, parcelas, taxa);
      parcelaEl.innerHTML = `ou <strong>${parcelas}x de R$ ${formatPrice(calc.parcela)}</strong>${taxa > 0 ? ' no cartão' : ' sem juros'}`;
      parcelaEl.style.display = 'block';
    } else {
      parcelaEl.style.display = 'none';
    }
  }
  const oldEl = document.getElementById('detail-price-old');
  oldEl.textContent = p.price_old ? `R$ ${formatPrice(p.price_old)}` : '';
  oldEl.style.display = p.price_old ? 'inline' : 'none';

  // Status
  const statusEl = document.getElementById('detail-status');
  statusEl.textContent = isEsg ? '○ Indisponível' : '● Disponível';
  statusEl.style.color = isEsg ? 'var(--grey)' : 'var(--success)';

  // Numerações
  const sizesEl = document.getElementById('detail-sizes');
  const sizeWrap = document.querySelector('.product-detail-sizes-wrap');
  if (sizes.length > 0) {
    sizesEl.innerHTML = sizes.map(s =>
      `<span class="detail-size" onclick="selectSize(this,'${s}')">${s}</span>`
    ).join('');
    sizeWrap.style.display = 'block';
  } else {
    sizeWrap.style.display = 'none';
  }

  // Galeria
  updateGallery();

  // Botão WhatsApp
  const waBtn = document.getElementById('detail-wa-btn');
  if (isEsg) {
    waBtn.className = 'btn-buy-detail disabled';
    waBtn.textContent = 'Produto Esgotado';
    waBtn.href = '#';
  } else {
    waBtn.className = 'btn-buy-detail';
    waBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Comprar pelo WhatsApp`;
    updateWaLink(p);
  }

  // guarda produto atual para atualizar link ao selecionar tamanho
  productOverlay._currentProduct = p;
  productOverlay.classList.add('open');
}

function selectSize(el, size) {
  document.querySelectorAll('.detail-size').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedSize = size;
  const p = productOverlay._currentProduct;
  if (p) updateWaLink(p);
}

function updateWaLink(p) {
  const sizeText = selectedSize ? `Numeração: ${selectedSize}` : 'Numeração desejada: ';
  const msg = encodeURIComponent(
    `Olá! Tenho interesse no produto:\n*${p.name}*\nReferência: ${p.reference || 'N/A'}\n${sizeText}`
  );
  const waBtn = document.getElementById('detail-wa-btn');
  if (waBtn && !waBtn.classList.contains('disabled')) {
    waBtn.href = `https://wa.me/${WHATSAPP}?text=${msg}`;
  }
}

function updateGallery() {
  const mainImg = document.getElementById('gallery-main-img');
  const counter = document.getElementById('gallery-counter');
  const thumbs  = document.getElementById('gallery-thumbs');
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');

  if (galleryPhotos.length === 0) {
    mainImg.src = '';
    mainImg.style.display = 'none';
    counter.style.display = 'none';
    thumbs.innerHTML = '';
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    return;
  }

  mainImg.style.display = 'block';
  mainImg.src = galleryPhotos[galleryIndex];
  counter.textContent = `${galleryIndex + 1} / ${galleryPhotos.length}`;
  counter.style.display = galleryPhotos.length > 1 ? 'block' : 'none';

  prevBtn.classList.toggle('hidden', galleryPhotos.length <= 1);
  nextBtn.classList.toggle('hidden', galleryPhotos.length <= 1);

  thumbs.innerHTML = galleryPhotos.map((url, i) => `
    <div class="gallery-thumb ${i === galleryIndex ? 'active' : ''}" onclick="goGallery(${i})">
      <img src="${url}" onerror="this.parentElement.style.display='none'" />
    </div>`
  ).join('');
  thumbs.style.display = galleryPhotos.length > 1 ? 'flex' : 'none';
}

function goGallery(idx) {
  galleryIndex = idx;
  updateGallery();
}

document.getElementById('gallery-prev').addEventListener('click', () => {
  galleryIndex = (galleryIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  updateGallery();
});

document.getElementById('gallery-next').addEventListener('click', () => {
  galleryIndex = (galleryIndex + 1) % galleryPhotos.length;
  updateGallery();
});

// Swipe touch para mobile
let touchStartX = 0;
document.querySelector('.gallery-main')?.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].clientX;
});
document.querySelector('.gallery-main')?.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 40) {
    if (diff > 0) galleryIndex = (galleryIndex + 1) % galleryPhotos.length;
    else          galleryIndex = (galleryIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    updateGallery();
  }
});
