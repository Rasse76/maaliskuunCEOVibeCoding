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
  const data = await apiFetch('/api/categories');
  categories = data.map(c => c.name);
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
  renderCategoryBrowser();
}

const CATEGORY_ICONS = {
  'Vavat & Kelat': '🎣',
  'Viheet':        '🪝',
  'Pyydykset':     '🕸️',
  'Tarvikkeet':    '🧰',
  'Varusteet':     '🎒',
};

async function renderCategoryBrowser() {
  const container = document.getElementById('categoryBrowser');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Get all products to count by category
  const allProducts = await apiFetch('/api/products?');
  const categoryCounts = {};
  categories.forEach(cat => {
    categoryCounts[cat] = allProducts.filter(p => p.category === cat).length;
  });
  
  // Add "All" option
  const allBtn = document.createElement('button');
  allBtn.className = 'category-btn active';
  allBtn.innerHTML = `<span class="cat-icon">📦</span><span class="cat-label">Kaikki</span><span class="cat-count">${allProducts.length}</span>`;
  allBtn.addEventListener('click', () => {
    document.getElementById('categoryFilter').value = '';
    loadProducts();
    updateCategoryButtons();
  });
  container.appendChild(allBtn);
  
  // Add category buttons
  categories.forEach(cat => {
    const icon = CATEGORY_ICONS[cat] || '📁';
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.innerHTML = `<span class="cat-icon">${icon}</span><span class="cat-label">${escHtml(cat)}</span><span class="cat-count">${categoryCounts[cat]}</span>`;
    btn.addEventListener('click', () => {
      document.getElementById('categoryFilter').value = cat;
      loadProducts();
      updateCategoryButtons();
    });
    container.appendChild(btn);
  });
  
  updateCategoryButtons();
}

function updateCategoryButtons() {
  const selectedCategory = document.getElementById('categoryFilter').value;
  document.querySelectorAll('.category-btn').forEach((btn, idx) => {
    btn.classList.remove('active');
    const label = btn.querySelector('.cat-label')?.textContent || '';
    if (idx === 0 && !selectedCategory) {
      btn.classList.add('active');
    } else if (selectedCategory && label === selectedCategory) {
      btn.classList.add('active');
    }
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
  updateCategoryButtons();
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

  const selectedCategory = document.getElementById('categoryFilter').value;
  const orderedCats = selectedCategory
    ? [selectedCategory]
    : [
        ...categories.filter(cat => products.some(p => p.category === cat)),
        ...[...new Set(products.map(p => p.category))].filter(c => !categories.includes(c)),
      ];

  grid.innerHTML = orderedCats.map(cat => {
    const catProducts = products.filter(p => p.category === cat);
    if (catProducts.length === 0) return '';
    const icon = CATEGORY_ICONS[cat] || '📁';
    return `
      <section class="category-section">
        <div class="category-section-header">
          <span class="category-section-icon">${icon}</span>
          <h2 class="category-section-title">${escHtml(cat)}</h2>
          <span class="category-section-count">${catProducts.length} tuotetta</span>
        </div>
        <div class="category-product-grid">
          ${catProducts.map(p => renderCard(p)).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function renderCard(p) {
  const status = quantityStatus(p.quantity);
  const priceHtml = p.price != null
    ? `<span class="card-price">${Number(p.price).toFixed(2)} €</span>`
    : '<span class="card-price" style="opacity:0.35">–</span>';
  const imgUrl = `https://picsum.photos/seed/fishing${p.id}/400/250`;

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="card-image-wrap">
        <img class="card-image" src="${imgUrl}" alt="${escHtml(p.name)}" loading="lazy" />
        <span class="quantity-badge ${status.cls} card-status-badge">${status.label}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escHtml(p.name)}</h3>
        ${p.description ? `<p class="card-description">${escHtml(p.description)}</p>` : ''}
        <div class="card-footer">
          <div class="quantity-control">
            <button class="qty-dec" data-id="${p.id}" title="Vähennä" ${p.quantity <= 0 ? 'disabled' : ''}>−</button>
            <span class="quantity-display">${p.quantity}</span>
            <button class="qty-inc" data-id="${p.id}" title="Lisää">+</button>
            <span class="quantity-unit">${escHtml(p.unit)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            ${priceHtml}
            <div class="card-actions">
              <button class="btn-icon edit" data-id="${p.id}" title="Muokkaa">✏️</button>
              <button class="btn-icon delete" data-id="${p.id}" title="Poista">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
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
   Category Management
   ============================================================ */
async function loadCategoriesList() {
  const data = await apiFetch('/api/categories');
  const list = document.getElementById('categoriesList');
  list.innerHTML = '';
  if (data.length === 0) {
    list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Ei kategorioita</p>';
    return;
  }
  data.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `
      <span class="category-name">${escHtml(cat.name)}</span>
      <button class="btn-icon delete-category" data-id="${cat.id}" title="Poista">🗑️</button>
    `;
    list.appendChild(item);
  });
}

function openCategoriesModal() {
  loadCategoriesList();
  document.getElementById('categoriesModal').classList.remove('hidden');
}

function closeCategoriesModal() {
  document.getElementById('categoriesModal').classList.add('hidden');
  document.getElementById('newCategoryInput').value = '';
}

async function createCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCategoryInput').value.trim();
  if (!name) {
    showToast('Kirjoita kategorian nimi', 'error');
    return;
  }
  try {
    await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
    showToast('Kategoria lisätty ✓');
    document.getElementById('newCategoryInput').value = '';
    await loadCategoriesList();
    await loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Haluatko varmasti poistaa tämän kategorian? (vain kategoriassa ei ole tuotteita)')) return;
  try {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    showToast('Kategoria poistettu');
    await loadCategoriesList();
    await loadCategories();
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

document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoriesModal);
document.getElementById('categoriesModalClose').addEventListener('click', closeCategoriesModal);
document.getElementById('categoriesModal').querySelector('.modal-backdrop').addEventListener('click', closeCategoriesModal);
document.getElementById('newCategoryForm').addEventListener('submit', createCategory);

document.getElementById('categoriesList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-category');
  if (btn) {
    await deleteCategory(btn.dataset.id);
  }
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
document.getElementById('categoryFilter').addEventListener('change', () => {
  loadProducts();
  updateCategoryButtons();
});

/* ============================================================
   Init
   ============================================================ */
(async () => {
  await loadCategories();
  await loadProducts();
})();
