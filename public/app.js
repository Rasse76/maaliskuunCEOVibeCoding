/* ============================================================
   State
   ============================================================ */
let products = [];
let categories = [];
let deleteTargetId = null;

/* ============================================================
   API Helpers
   ============================================================ */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tapahtui virhe');
  return data;
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

/* ============================================================
   Load & Render
   ============================================================ */
async function loadCategories() {
  categories = await apiFetch('/api/categories');
  const sel = document.getElementById('categoryFilter');
  const list = document.getElementById('categoryList');
  sel.innerHTML = '<option value="">Kaikki kategoriat</option>';
  list.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
    const listOpt = document.createElement('option');
    listOpt.value = cat;
    list.appendChild(listOpt);
  });
}

async function loadProducts() {
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  products = await apiFetch(`/api/products?${params}`);
  renderProducts();
}

function quantityStatus(qty) {
  if (qty === 0) return { label: 'Loppu', cls: 'out' };
  if (qty <= 5) return { label: 'Vähän', cls: 'low' };
  return { label: 'Varastossa', cls: 'ok' };
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('productCount');

  count.textContent = `${products.length} tuotetta`;

  if (products.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = products.map(p => {
    const status = quantityStatus(p.quantity);
    const priceHtml = p.price != null
      ? `<span class="card-price">${Number(p.price).toFixed(2)} €</span>`
      : '<span class="card-price" style="opacity:0.35">–</span>';

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="card-header">
          <h3 class="card-title">${escHtml(p.name)}</h3>
          <span class="card-category">${escHtml(p.category)}</span>
        </div>
        ${p.description ? `<p class="card-description">${escHtml(p.description)}</p>` : ''}
        <div class="card-footer">
          <div class="quantity-control">
            <button class="qty-dec" data-id="${p.id}" title="Vähennä" ${p.quantity <= 0 ? 'disabled' : ''}>−</button>
            <span class="quantity-display">${p.quantity}</span>
            <button class="qty-inc" data-id="${p.id}" title="Lisää">+</button>
            <span class="quantity-unit">${escHtml(p.unit)}</span>
            <span class="quantity-badge ${status.cls}">${status.label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            ${priceHtml}
            <div class="card-actions">
              <button class="btn-icon edit" data-id="${p.id}" title="Muokkaa">✏️</button>
              <button class="btn-icon delete" data-id="${p.id}" title="Poista">🗑️</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* ============================================================
   Quantity increment/decrement
   ============================================================ */
async function changeQuantity(id, delta) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const newQty = product.quantity + delta;
  if (newQty < 0) return;
  try {
    const updated = await apiFetch(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: newQty }),
    });
    Object.assign(product, updated);
    renderProducts();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* ============================================================
   Modal helpers
   ============================================================ */
function openModal() {
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('modalTitle').textContent = 'Lisää tuote';
}
function openDeleteModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  deleteTargetId = id;
  document.getElementById('deleteMessage').textContent =
    `Haluatko varmasti poistaa tuotteen "${product.name}"?`;
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  deleteTargetId = null;
}

function fillForm(product) {
  document.getElementById('modalTitle').textContent = 'Muokkaa tuotetta';
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productUnit').value = product.unit;
  document.getElementById('productQuantity').value = product.quantity;
  document.getElementById('productPrice').value = product.price != null ? product.price : '';
  document.getElementById('productDescription').value = product.description || '';
}

/* ============================================================
   Save product (create or update)
   ============================================================ */
async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const payload = {
    name: document.getElementById('productName').value.trim(),
    category: document.getElementById('productCategory').value.trim(),
    description: document.getElementById('productDescription').value.trim(),
    quantity: parseInt(document.getElementById('productQuantity').value) || 0,
    unit: document.getElementById('productUnit').value,
    price: document.getElementById('productPrice').value
      ? parseFloat(document.getElementById('productPrice').value)
      : null,
  };

  try {
    if (id) {
      await apiFetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showToast('Tuote päivitetty ✓');
    } else {
      await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Tuote lisätty ✓');
    }
    closeModal();
    await loadCategories();
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   Delete product
   ============================================================ */
async function deleteProduct() {
  if (!deleteTargetId) return;
  try {
    await apiFetch(`/api/products/${deleteTargetId}`, { method: 'DELETE' });
    showToast('Tuote poistettu');
    closeDeleteModal();
    await loadCategories();
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   Escape HTML helper
   ============================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   Event Delegation for dynamic card buttons
   ============================================================ */
document.getElementById('productGrid').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);

  if (btn.classList.contains('qty-inc')) {
    await changeQuantity(id, 1);
  } else if (btn.classList.contains('qty-dec')) {
    await changeQuantity(id, -1);
  } else if (btn.classList.contains('edit')) {
    const product = products.find(p => p.id === id);
    if (product) { fillForm(product); openModal(); }
  } else if (btn.classList.contains('delete')) {
    openDeleteModal(id);
  }
});

/* ============================================================
   Static button event listeners
   ============================================================ */
document.getElementById('addProductBtn').addEventListener('click', () => {
  document.getElementById('productId').value = '';
  document.getElementById('modalTitle').textContent = 'Lisää tuote';
  openModal();
});

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modal').querySelector('.modal-backdrop').addEventListener('click', closeModal);

document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
document.getElementById('deleteModal').querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);
document.getElementById('deleteConfirmBtn').addEventListener('click', deleteProduct);

document.getElementById('productForm').addEventListener('submit', saveProduct);

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadProducts, 280);
});
document.getElementById('categoryFilter').addEventListener('change', loadProducts);

/* ============================================================
   Init
   ============================================================ */
(async () => {
  await loadCategories();
  await loadProducts();
})();
