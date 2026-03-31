const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const db = initDatabase();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(limiter);
app.use(express.static(path.join(__dirname, 'public')));

// GET all products (with optional search/filter)
app.get('/api/products', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM products';
  const params = [];

  const conditions = [];
  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY category, name';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// GET categories
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(categories.map(r => r.category));
});

// GET single product
app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Tuotetta ei löydy' });
  res.json(product);
});

// POST create product
app.post('/api/products', (req, res) => {
  const { name, category, description, quantity, unit, price } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Nimi ja kategoria ovat pakollisia' });
  }
  const qty = parseInt(quantity) || 0;
  if (qty < 0) return res.status(400).json({ error: 'Määrä ei voi olla negatiivinen' });

  const result = db.prepare(`
    INSERT INTO products (name, category, description, quantity, unit, price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, description || '', qty, unit || 'kpl', price || null);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

// PATCH update product
app.patch('/api/products/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tuotetta ei löydy' });

  const { name, category, description, quantity, unit, price } = req.body;

  const newName = name !== undefined ? name : existing.name;
  const newCategory = category !== undefined ? category : existing.category;
  const newDescription = description !== undefined ? description : existing.description;
  const newUnit = unit !== undefined ? unit : existing.unit;
  const newPrice = price !== undefined ? price : existing.price;

  let newQuantity = existing.quantity;
  if (quantity !== undefined) {
    newQuantity = parseInt(quantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      return res.status(400).json({ error: 'Virheellinen määrä' });
    }
  }

  if (!newName || !newCategory) {
    return res.status(400).json({ error: 'Nimi ja kategoria ovat pakollisia' });
  }

  db.prepare(`
    UPDATE products
    SET name = ?, category = ?, description = ?, quantity = ?, unit = ?, price = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newName, newCategory, newDescription, newQuantity, newUnit, newPrice, req.params.id);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tuotetta ei löydy' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Serve the frontend for any other route
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kalastusvälineiden inventaario käynnissä: http://localhost:${PORT}`);
});

module.exports = app;
