// Backend: Express REST API + static frontend. Auth = bcrypt-hashed passwords + JWT. Emails = Nodemailer.
const express = require('express'), path = require('path'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), nodemailer = require('nodemailer');
const { db, seed } = require('./db');
seed();
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const NOTIFY = process.env.NOTIFY_EMAIL || 'stark991101@gmail.com';
const all = (s, ...p) => db.prepare(s).all(...p), one = (s, ...p) => db.prepare(s).get(...p), run = (s, ...p) => db.prepare(s).run(...p);
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), phoneOk = p => /^\d{10}$/.test(p);
const clean = (v, m = 200) => String(v ?? '').trim().slice(0, m);
const bad = (r, m, c = 400) => r.status(c).json({ error: m });
const CATS = ['Smart Lights', 'Smart Sensors', 'Smart Door Lock'], TICKETS = ['Student', 'Professional', 'Speaker'];
const TOPICS = ['Smart Homes', 'IoT', 'Home Security', 'Smart Cities', 'Sensors and Embedded Systems'];

// Email: fire-and-forget. If SMTP_USER/SMTP_PASS are missing, emails are printed in the console instead.
const tx = process.env.SMTP_USER ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
const mail = (to, subject, text) => {
  if (!tx) return console.log(`[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
  tx.sendMail({ from: `NexGen <${process.env.SMTP_USER}>`, to, subject, text }).catch(e => console.error('Email failed:', e.message));
};

// Default admin account (change ADMIN_EMAIL / ADMIN_PASSWORD in .env)
const AE = (process.env.ADMIN_EMAIL || 'admin@nexgen.com').toLowerCase();
if (!one('SELECT id FROM users WHERE email=?', AE)) run('INSERT INTO users(name,email,hash,role) VALUES(?,?,?,?)', 'NexGen Admin', AE, bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10), 'admin');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Auth helpers: who() reads the JWT; auth blocks guests; admin blocks non-admins
const sign = u => jwt.sign({ id: u.id, name: u.name, role: u.role }, SECRET, { expiresIn: '7d' });
const who = q => { try { return jwt.verify((q.get('authorization') || '').slice(7), SECRET); } catch { return null; } };
const auth = (q, r, n) => { q.user = who(q); q.user ? n() : bad(r, 'Please sign in to continue.', 401); };
const admin = [auth, (q, r, n) => q.user.role === 'admin' ? n() : bad(r, 'Admins only.', 403)];

// ---- Accounts ----
app.post('/api/auth/signup', (q, r) => {
  const name = clean(q.body.name), email = clean(q.body.email).toLowerCase(), phone = clean(q.body.phone, 15), pw = String(q.body.password || '');
  if (!name || !emailOk(email) || pw.length < 6) return bad(r, 'Enter your name, a valid email and a password of at least 6 characters.');
  try {
    const { lastInsertRowid: id } = run('INSERT INTO users(name,email,phone,hash) VALUES(?,?,?,?)', name, email, phone, bcrypt.hashSync(pw, 10));
    const u = { id, name, email, phone, role: 'user' };
    r.status(201).json({ token: sign(u), user: u });
  } catch { bad(r, 'This email is already registered. Sign in instead.', 409); }
});
app.post('/api/auth/login', (q, r) => {
  const u = one('SELECT * FROM users WHERE email=?', clean(q.body.email).toLowerCase());
  if (!u || !bcrypt.compareSync(String(q.body.password || ''), u.hash)) return bad(r, 'Wrong email or password.', 401);
  const { hash, ...p } = u;
  r.json({ token: sign(p), user: p });
});

// ---- Store ----
app.get('/api/products', (_q, r) => r.json(all('SELECT * FROM products ORDER BY id')));
app.get('/api/cart', auth, (q, r) => r.json(JSON.parse(one('SELECT items FROM carts WHERE user_id=?', q.user.id)?.items || '[]')));
app.put('/api/cart', auth, (q, r) => {
  const items = (Array.isArray(q.body.items) ? q.body.items : []).slice(0, 50).map(i => ({ id: +i.id, qty: Math.max(1, Math.min(20, +i.qty || 1)) }));
  run('INSERT INTO carts(user_id,items) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET items=excluded.items', q.user.id, JSON.stringify(items));
  r.json({ ok: true });
});
const orderOut = o => ({ ...o, orderId: 'NGX-' + (1000 + o.id), items: JSON.parse(o.items) });
app.post('/api/orders', auth, (q, r) => {
  const name = clean(q.body.name), phone = clean(q.body.phone, 15), address = clean(q.body.address, 400);
  if (!name || !phoneOk(phone) || address.length < 10) return bad(r, 'Enter your name, a 10-digit phone number and a full address.');
  const items = [];  // prices always come from the database, never from the browser
  for (const i of q.body.items || []) { const p = one('SELECT * FROM products WHERE id=?', +i.id); if (p) items.push({ id: p.id, name: p.name, price: p.price, qty: Math.max(1, Math.min(20, +i.qty || 1)) }); }
  if (!items.length) return bad(r, 'Your cart is empty.');
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const { lastInsertRowid: id } = run('INSERT INTO orders(user_id,name,phone,address,items,total) VALUES(?,?,?,?,?,?)', q.user.id, name, phone, address, JSON.stringify(items), total);
  run('DELETE FROM carts WHERE user_id=?', q.user.id);
  const oid = 'NGX-' + (1000 + id), email = one('SELECT email FROM users WHERE id=?', q.user.id).email;
  const body = `Order ${oid}\nCustomer: ${name}\nPhone: ${phone}\nAddress: ${address}\n\n` + items.map(i => `- ${i.name} x ${i.qty} = Rs. ${i.price * i.qty}`).join('\n') + `\n\nTotal: Rs. ${total} (Cash on Delivery)`;
  mail(NOTIFY, 'New NexGen order ' + oid, body + '\nCustomer email: ' + email);
  mail(email, 'Your NexGen order ' + oid, 'Thank you for shopping with NexGen!\n\n' + body);
  r.status(201).json({ orderId: oid, total });
});
app.get('/api/orders', auth, (q, r) => r.json(all('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC', q.user.id).map(orderOut)));

// ---- Summit ----
app.get('/api/speakers', (_q, r) => r.json(all('SELECT * FROM speakers')));
app.get('/api/sessions', (_q, r) => r.json(all('SELECT * FROM sessions ORDER BY day,time')));
app.post('/api/register', (q, r) => {
  const b = q.body, u = who(q), name = clean(b.name), email = clean(b.email).toLowerCase(), phone = clean(b.phone, 15), org = clean(b.org), ticket = clean(b.ticket), workshop = clean(b.workshop);
  if (!name || !emailOk(email) || !phoneOk(phone) || !org || !TICKETS.includes(ticket)) return bad(r, 'Fill every field with a valid email and a 10-digit phone number.');
  const { lastInsertRowid: id } = run('INSERT INTO registrations(user_id,reg_id,name,email,phone,org,ticket,workshop) VALUES(?,?,?,?,?,?,?,?)', u?.id ?? null, '', name, email, phone, org, ticket, workshop);
  const regId = 'NGS26-' + String(id).padStart(4, '0');
  run('UPDATE registrations SET reg_id=? WHERE id=?', regId, id);
  const body = `Registration ${regId}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nCollege/Organization: ${org}\nTicket: ${ticket}\nWorkshop: ${workshop || 'None'}`;
  mail(NOTIFY, 'New Summit registration ' + regId, body);
  mail(email, 'You are registered for NexGen Smart Living Summit 2026 (' + regId + ')', 'Thank you for registering! Keep this ID for entry.\n\n' + body);
  r.status(201).json({ regId });
});
app.get('/api/my/registrations', auth, (q, r) => r.json(all('SELECT * FROM registrations WHERE user_id=? OR email=(SELECT email FROM users WHERE id=?) ORDER BY id DESC', q.user.id, q.user.id)));
app.post('/api/submissions', auth, (q, r) => {
  const b = q.body, title = clean(b.title, 250), abstract = clean(b.abstract, 3000), category = clean(b.category), team = clean(b.team, 400), link = clean(b.link, 400);
  if (!title || !team || abstract.length < 50 || !TOPICS.includes(category)) return bad(r, 'Fill every field. The abstract needs at least 50 characters.');
  if (!/^https?:\/\//.test(link)) return bad(r, 'Add a link to your PDF or project (starting with http:// or https://).');
  const email = one('SELECT email FROM users WHERE id=?', q.user.id).email;
  const { lastInsertRowid: id } = run('INSERT INTO submissions(user_id,email,title,abstract,category,team,link) VALUES(?,?,?,?,?,?,?)', q.user.id, email, title, abstract, category, team, link);
  const sid = 'SUB-' + String(id).padStart(4, '0');
  const body = `Submission ${sid}\nTitle: ${title}\nCategory: ${category}\nTeam: ${team}\nLink: ${link}\nContact: ${email}\n\nAbstract:\n${abstract}`;
  mail(NOTIFY, 'New Summit submission ' + sid, body);
  mail(email, 'We received your submission ' + sid, 'Thank you! Your project is now Submitted. Track its status under Summit > Submit Project.\n\n' + body);
  r.status(201).json({ sid });
});
app.get('/api/my/submissions', auth, (q, r) => r.json(all('SELECT * FROM submissions WHERE user_id=? ORDER BY id DESC', q.user.id)));
app.post('/api/contact', (q, r) => {
  const name = clean(q.body.name), email = clean(q.body.email).toLowerCase(), message = clean(q.body.message, 2000);
  if (!name || !emailOk(email) || message.length < 5) return bad(r, 'Enter your name, a valid email and a message.');
  run('INSERT INTO contact_messages(name,email,message) VALUES(?,?,?)', name, email, message);
  mail(NOTIFY, 'NexGen contact message from ' + name, `From: ${name} <${email}>\n\n${message}`);
  r.status(201).json({ ok: true });
});

// ---- Admin ----
const TABLES = ['orders', 'products', 'registrations', 'submissions', 'contact_messages'];
app.get('/api/admin/:t', admin, (q, r) => {
  if (!TABLES.includes(q.params.t)) return bad(r, 'Unknown table.', 404);
  const rows = all(`SELECT * FROM ${q.params.t} ORDER BY id DESC`);
  r.json(q.params.t === 'orders' ? rows.map(orderOut) : rows);
});
app.patch('/api/admin/:t/:id', admin, (q, r) => {
  const ok = { orders: ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'], submissions: ['Submitted', 'Under Review', 'Accepted', 'Rejected'] }[q.params.t];
  if (!ok || !ok.includes(q.body.status)) return bad(r, 'Invalid status.');
  run(`UPDATE ${q.params.t} SET status=? WHERE id=?`, q.body.status, +q.params.id);
  r.json({ ok: true });
});
const prod = b => [clean(b.name), CATS.includes(b.category) ? b.category : null, Math.max(0, Math.floor(+b.price) || 0), clean(b.description, 400), clean(b.icon, 4) || '📦'];
app.post('/api/admin/products', admin, (q, r) => {
  const p = prod(q.body); if (!p[0] || !p[1] || !p[2]) return bad(r, 'Name, category and price are required.');
  run('INSERT INTO products(name,category,price,description,icon) VALUES(?,?,?,?,?)', ...p); r.status(201).json({ ok: true });
});
app.put('/api/admin/products/:id', admin, (q, r) => {
  const p = prod(q.body); if (!p[0] || !p[1] || !p[2]) return bad(r, 'Name, category and price are required.');
  run('UPDATE products SET name=?,category=?,price=?,description=?,icon=? WHERE id=?', ...p, +q.params.id); r.json({ ok: true });
});

app.use('/api', (_q, r) => bad(r, 'Not found.', 404));
app.use((e, _q, r, _n) => { console.error(e); bad(r, 'Server error. Try again.', 500); });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`NexGen running on http://localhost:${port}  (admin: ${AE})`));
