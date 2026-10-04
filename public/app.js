// NexGen single-page app: hash router + fetch to /api. User, token and cart live in localStorage.
const $ = s => document.querySelector(s), app = $('#app'), dlg = $('#dlg');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const S = JSON.parse(localStorage.getItem('ng') || 'null') || { user: null, token: null, cart: [] };
const save = () => { localStorage.setItem('ng', JSON.stringify(S)); drawNav(); };
let P = [], SP = [], DAY = 1, AT = 'orders', EDIT = null;

// API helper: adds the JWT, throws readable errors
async function api(p, o = {}) {
  const r = await fetch('/api' + p, { method: o.method || 'GET', headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.');
  return j;
}
function toast(m, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = m; t.setAttribute('role', 'status'); document.body.append(t); setTimeout(() => t.remove(), 3500); }
const popup = h => { dlg.innerHTML = h + '<form method="dialog" style="margin-top:12px"><button class="btn">Close</button></form>'; dlg.showModal(); };
const inp = (n, l, t = 'text', v = '', x = '') => `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" required ${x}></label>`;
const ta = (n, l, r = 4) => `<label>${l}<textarea name="${n}" rows="${r}" required></textarea></label>`;
const sel = (n, l, o, v) => `<label>${l}<select name="${n}">${o.map(x => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
function onForm(id, fn) { const f = document.getElementById(id); f.onsubmit = async e => { e.preventDefault(); const b = f.querySelector('button'); b.disabled = true; try { await fn(Object.fromEntries(new FormData(f))); } catch (x) { toast(x.message, 1); } b.disabled = false; }; }
const PH = 'pattern="\\d{10}" title="10-digit phone number" maxlength="10" inputmode="numeric"';

// ---- Navbar (rebuilt whenever login state or cart changes) ----
function drawNav() {
  const u = S.user, n = S.cart.reduce((s, i) => s + i.qty, 0);
  $('#nav').innerHTML = `<a class="brand" href="#/"><img src="logo-mark.png" alt="NexGen"><span>Smart solutions,<br>better living</span></a>
<button id="burger" aria-label="Menu" aria-expanded="false">☰</button>
<ul id="links"><li><a href="#/">Home</a></li><li><a href="#/products">Products</a></li><li><a href="#/features">Features</a></li><li><a href="#/demo">Live Demo</a></li>
<li class="dd"><a href="#/summit" aria-haspopup="true">Summit ▾</a><ul><li><a href="#/summit">About</a></li><li><a href="#/schedule">Schedule</a></li><li><a href="#/speakers">Speakers</a></li><li><a href="#/register">Register</a></li><li><a href="#/submit">Submit Project</a></li></ul></li>
<li><a href="#/orders">Orders</a></li><li><a href="#/contact">Contact</a></li>
<li class="dd">${u ? `<a href="#/profile" aria-haspopup="true">${esc(u.name.split(' ')[0])} ▾</a><ul><li><a href="#/profile">Profile</a></li><li><a href="#/orders">My Orders</a></li><li><a href="#/myregs">My Registrations</a></li>${u.role === 'admin' ? '<li><a href="#/admin">Admin panel</a></li>' : ''}<li><a href="#/logout">Logout</a></li></ul>` : '<a class="btn sm" href="#/login">Sign In</a>'}</li>
<li><a href="#/cart" aria-label="Cart, ${n} items">🛒<span class="badge">${n}</span></a></li></ul>`;
}

// ---- Cart (saved to the database too when logged in) ----
const syncCart = () => S.token && api('/cart', { method: 'PUT', body: { items: S.cart } }).catch(() => {});
function addCart(id) { const c = S.cart.find(x => x.id == id); c ? c.qty = Math.min(20, c.qty + 1) : S.cart.push({ id: +id, qty: 1 }); save(); syncCart(); toast('Added to cart'); }

// ---- Store views ----
const prodCard = p => `<article class="card"><div class="ph" aria-hidden="true">${p.icon}</div><h3><a href="#/product/${p.id}">${esc(p.name)}</a></h3><p class="sm">${esc(p.description)}</p><div class="row"><b>${money(p.price)}</b><button class="btn sm" data-add="${p.id}">Add to cart</button></div></article>`;
const home = () => `<section class="hero"><div class="wrap"><div><h1>Smart Solutions, Better Living</h1><p class="lead">NexGen builds smart lights, gas-leak sensors and door locks that you control from one app. Safer, simpler and more efficient homes.</p><p class="row l"><a class="btn" href="#/products">Shop Now</a><a class="btn alt" href="#/register">Register for Summit</a></p></div><img class="logo" src="logo.jpg" alt="NexGen - Next Generation Home"></div></section>
<section class="wrap"><h2>Featured products</h2><div class="grid">${[1, 4, 7].map(id => P.find(p => p.id == id)).filter(Boolean).map(prodCard).join('')}</div></section>
<section class="wrap"><h2>How it works</h2><div class="grid">${[['1', 'Install', 'Fit the bulb, sensor or lock in minutes. No rewiring needed.'], ['2', 'Connect to the app', 'Pair every device with your phone over Wi-Fi.'], ['3', 'Automate', 'Set routines, schedules and alerts, then relax.']].map(s => `<div class="card"><h3>${s[0]}. ${s[1]}</h3><p class="sm">${s[2]}</p></div>`).join('')}</div></section>
<section class="band"><div class="wrap"><h2>NexGen Smart Living Summit 2026</h2><p>Talks, workshops and a project showcase on smart homes and IoT.</p><p class="cd" data-cd></p><a class="btn" href="#/summit">Explore the Summit</a></div></section>`;
function products() {
  const cats = ['All', ...new Set(P.map(p => p.category))]; let cat = 'All', q = '';
  app.innerHTML = `<section class="wrap"><h1>Products</h1><p class="chips">${cats.map(c => `<button class="chip${c === 'All' ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</p><p><input id="q" type="search" placeholder="Search products" aria-label="Search products" style="max-width:360px"></p><div class="grid" id="pg"></div></section>`;
  const draw = () => { const l = P.filter(p => (cat === 'All' || p.category === cat) && (p.name + p.description).toLowerCase().includes(q)); $('#pg').innerHTML = l.length ? l.map(prodCard).join('') : '<p>No products match. Try another category or search.</p>'; document.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('on', b.dataset.cat === cat)); };
  draw(); $('#q').oninput = e => { q = e.target.value.toLowerCase(); draw(); };
  app.onclick = e => { const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; draw(); } };
}
const product = id => { const p = P.find(x => x.id == id); return p ? `<section class="wrap"><a href="#/products">← All products</a><div class="card" style="margin-top:16px;max-width:620px"><div class="ph" style="height:180px;font-size:5rem">${p.icon}</div><h1>${esc(p.name)}</h1><p class="chip" style="display:inline-block">${esc(p.category)}</p><p class="lead">${esc(p.description)}</p><p class="row"><b style="font-size:1.4rem">${money(p.price)}</b><button class="btn" data-add="${p.id}">Add to cart</button></p></div></section>` : '<section class="wrap"><h1>Product not found</h1><a href="#/products">Back to products</a></section>'; };
const features = () => `<section class="wrap"><h1>Features</h1><p class="lead">Everything works together from one app.</p><div class="grid">${[['📱', 'One-tap control', 'Switch lights and appliances on or off from your mobile app, from anywhere.'], ['🔥', 'Gas leak alerts', 'The sensor detects a leak and sends an instant alert message to the owner.'], ['🔐', 'Auto-locking door', 'If the smart door lock is left unlocked for more than 5 minutes, it locks itself.'], ['👤', 'Unknown visitor alert', 'When an unknown person is at the door, you get an instant SMS and app notification.'], ['⏱️', 'Routines and savings', 'Schedule lights, build automation routines and cut your energy use.']].map(f => `<div class="card"><div class="ico" aria-hidden="true">${f[0]}</div><h3>${f[1]}</h3><p class="sm">${f[2]}</p></div>`).join('')}</div><p><a class="btn" href="#/demo">Try the live demo</a></p></section>`;
function cart() {
  const rows = S.cart.map(i => ({ ...i, p: P.find(p => p.id == i.id) })).filter(i => i.p), total = rows.reduce((s, i) => s + i.p.price * i.qty, 0);
  app.innerHTML = `<section class="wrap"><h1>Your cart</h1>${rows.length ? `<div class="tw"><table><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr>${rows.map(i => `<tr><td>${esc(i.p.name)}</td><td>${money(i.p.price)}</td><td><button class="btn alt sm" data-q="${i.id}:-1" aria-label="Decrease">−</button> ${i.qty} <button class="btn alt sm" data-q="${i.id}:1" aria-label="Increase">+</button></td><td>${money(i.p.price * i.qty)}</td><td><button class="btn alt sm" data-rm="${i.id}">Remove</button></td></tr>`).join('')}</table></div><p class="row"><b style="font-size:1.3rem">Total: ${money(total)}</b><a class="btn" href="#/checkout">Proceed to Checkout</a></p>` : '<p>Your cart is empty.</p><a class="btn" href="#/products">Shop products</a>'}</section>`;
}
function checkout() {
  const rows = S.cart.map(i => ({ ...i, p: P.find(p => p.id == i.id) })).filter(i => i.p), total = rows.reduce((s, i) => s + i.p.price * i.qty, 0);
  if (!rows.length) { location.hash = '#/cart'; return; }
  app.innerHTML = `<section class="wrap"><h1>Checkout</h1><p class="lead">${rows.length} item(s) · Total ${money(total)} · Payment: Cash on Delivery (demo)</p><form id="f">${inp('name', 'Full name', 'text', S.user.name)}${inp('phone', 'Phone', 'tel', S.user.phone || '', PH)}${ta('address', 'Delivery address')}<button class="btn">Place Order</button></form></section>`;
  onForm('f', async d => { const r = await api('/orders', { method: 'POST', body: { ...d, items: S.cart } }); S.cart = []; save(); app.innerHTML = `<section class="wrap"><h1>Order placed 🎉</h1><p class="lead">Your order ID is <b>${r.orderId}</b>. Total ${money(r.total)} payable on delivery. A confirmation email is on its way.</p><a class="btn" href="#/orders">View my orders</a></section>`; });
}
async function orders() {
  const o = await api('/orders');
  app.innerHTML = `<section class="wrap"><h1>My orders</h1>${o.length ? o.map(x => `<div class="card" style="margin-bottom:14px"><div class="row"><b>${x.orderId}</b><span class="chip">${esc(x.status)}</span></div><p class="sm">${new Date(x.created + 'Z').toLocaleDateString('en-IN')}</p><p>${x.items.map(i => `${esc(i.name)} × ${i.qty}`).join('<br>')}</p><b>${money(x.total)}</b></div>`).join('') : '<p>No orders yet.</p><a class="btn" href="#/products">Shop products</a>'}</section>`;
}
const authView = up => { app.innerHTML = `<section class="wrap"><h1>${up ? 'Create account' : 'Sign in'}</h1><form id="f">${up ? inp('name', 'Full name') + inp('phone', 'Phone', 'tel', '', PH).replace(' required', '') : ''}${inp('email', 'Email', 'email')}${inp('password', 'Password' + (up ? ' (6+ characters)' : ''), 'password', '', 'minlength="6"')}<button class="btn">${up ? 'Sign up' : 'Sign in'}</button></form><p>${up ? 'Already have an account? <a href="#/login">Sign in</a>' : 'New to NexGen? <a href="#/signup">Create an account</a>'}</p></section>`;
  onForm('f', async d => { const r = await api('/auth/' + (up ? 'signup' : 'login'), { method: 'POST', body: d }); S.user = r.user; S.token = r.token; const srv = await api('/cart').catch(() => []); srv.forEach(s => { const c = S.cart.find(x => x.id == s.id); if (!c) S.cart.push(s); }); save(); syncCart(); toast('Welcome, ' + r.user.name.split(' ')[0]); location.hash = S.next || '#/'; S.next = null; }); };
const profile = () => `<section class="wrap"><h1>Profile</h1><div class="card" style="max-width:480px"><p><b>Name:</b> ${esc(S.user.name)}</p><p><b>Email:</b> ${esc(S.user.email)}</p><p><b>Phone:</b> ${esc(S.user.phone || 'Not added')}</p><p><b>Role:</b> ${esc(S.user.role)}</p></div><p class="row l"><a class="btn alt" href="#/orders">My orders</a><a class="btn alt" href="#/myregs">My registrations</a><a class="btn alt" href="#/submit">My submissions</a></p></section>`;

// ---- Summit views ----
const summit = () => `<section class="wrap"><h1>NexGen Smart Living Summit 2026</h1><p class="lead">Theme: homes that think, protect and save. Hosted by NexGen.</p><p><b>12–14 December 2026</b> · Main Campus Auditorium (sample venue)</p><p class="cd" data-cd></p><h2>Key topics</h2><p class="chips">${['Smart Homes', 'IoT', 'Home Security', 'Smart Cities', 'Sensors & Embedded Systems'].map(t => `<span class="chip">${t}</span>`).join('')}</p><p class="row l" style="margin-top:20px"><a class="btn" href="#/register">Register</a><a class="btn alt" href="#/schedule">View schedule</a><a class="btn alt" href="#/submit">Submit project</a></p></section>`;
async function schedule() {
  const s = await api('/sessions'), days = [...new Set(s.map(x => x.day))];
  app.innerHTML = `<section class="wrap"><h1>Schedule</h1><p class="chips">${days.map(d => `<button class="chip${d == DAY ? ' on' : ''}" data-day="${d}">Day ${d} · ${11 + d} Dec</button>`).join('')}</p>${s.filter(x => x.day == DAY).map(x => `<div class="slot"><time>${esc(x.time)}</time><div><b>${esc(x.title)}</b><br><span class="sm">${esc(x.speaker ? x.speaker + ' · ' : '')}${esc(x.hall)}</span></div><span class="chip">${esc(x.type)}</span></div>`).join('')}</section>`;
}
async function speakers() {
  SP = await api('/speakers');
  app.innerHTML = `<section class="wrap"><h1>Speakers</h1><div class="grid">${SP.map(s => `<article class="card"><div class="ph" aria-hidden="true" style="font-weight:700;color:#fff">${esc(s.name.replace(/^(Dr\.|Prof\.)\s*/, '').split(' ').map(w => w[0]).join('').slice(0, 2))}</div><h3>${esc(s.name)}</h3><p class="sm">${esc(s.role)}</p><p><b>${esc(s.topic)}</b></p><button class="btn alt sm" data-sp="${s.id}">Read bio</button></article>`).join('')}</div></section>`;
}
const register = () => { app.innerHTML = `<section class="wrap"><h1>Register</h1><p class="lead">Reserve your seat at the Summit. You will get a registration ID and a confirmation email.</p><form id="f">${inp('name', 'Full name', 'text', S.user?.name || '')}${inp('email', 'Email', 'email', S.user?.email || '')}${inp('phone', 'Phone', 'tel', S.user?.phone || '', PH)}${inp('org', 'College or organization')}${sel('ticket', 'Ticket type', ['Student', 'Professional', 'Speaker'])}${sel('workshop', 'Workshop', ['None', 'IoT Sensors Hands-on', 'Smart Home Security Lab', 'Home Automation with the Mobile App'])}<button class="btn">Register</button></form></section>`;
  onForm('f', async d => { const r = await api('/register', { method: 'POST', body: d }); app.innerHTML = `<section class="wrap"><h1>You are registered 🎉</h1><p class="lead">Your registration ID is <b>${r.regId}</b>. We sent a confirmation to ${esc(d.email)}. Show this ID at the entry desk.</p><a class="btn" href="#/schedule">View schedule</a></section>`; }); };
async function submit() {
  const mine = await api('/my/submissions');
  app.innerHTML = `<section class="wrap"><h1>Submit your project</h1><p class="lead">Share a paper or project. Upload your PDF to Google Drive and paste the public link.</p><form id="f">${inp('title', 'Project title')}${sel('category', 'Category', ['Smart Homes', 'IoT', 'Home Security', 'Smart Cities', 'Sensors and Embedded Systems'])}${ta('abstract', 'Abstract (50+ characters)', 5)}${inp('team', 'Team members (comma separated)')}${inp('link', 'PDF or project link', 'url', '', 'placeholder="https://"')}<button class="btn">Submit</button></form><h2 style="margin-top:36px">My submissions</h2>${mine.length ? `<div class="tw"><table><tr><th>Title</th><th>Category</th><th>Status</th></tr>${mine.map(m => `<tr><td>${esc(m.title)}</td><td>${esc(m.category)}</td><td><span class="chip">${esc(m.status)}</span></td></tr>`).join('')}</table></div>` : '<p>Nothing submitted yet.</p>'}</section>`;
  onForm('f', async d => { const r = await api('/submissions', { method: 'POST', body: d }); toast('Submitted. ID ' + r.sid); submit(); });
}
async function myregs() { const r = await api('/my/registrations'); app.innerHTML = `<section class="wrap"><h1>My registrations</h1>${r.length ? r.map(x => `<div class="card" style="margin-bottom:12px"><b>${esc(x.reg_id)}</b> · ${esc(x.ticket)}<br><span class="sm">${esc(x.name)} · ${esc(x.org)} · Workshop: ${esc(x.workshop || 'None')}</span></div>`).join('') : '<p>No registrations yet.</p><a class="btn" href="#/register">Register now</a>'}</section>`; }
const contact = () => { app.innerHTML = `<section class="wrap"><h1>Contact</h1><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:36px"><form id="f">${inp('name', 'Name', 'text', S.user?.name || '')}${inp('email', 'Email', 'email', S.user?.email || '')}${ta('message', 'Message')}<button class="btn">Send message</button></form><div><div class="map" role="img" aria-label="Map placeholder">Map placeholder</div><h2 style="margin-top:28px">FAQ</h2>${[['Is the Summit open to students?', 'Yes. Choose the Student ticket when you register.'], ['How do I submit a project?', 'Sign in, open Summit > Submit Project and add your abstract and a PDF link.'], ['How do I pay for orders?', 'This demo store supports Cash on Delivery.']].map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join('')}</div></div></section>`;
  onForm('f', async d => { await api('/contact', { method: 'POST', body: d }); toast('Message sent. We will reply soon.'); $('#f').reset(); }); };

// ---- Live smart home demo (simulation only) ----
let dt;
function demo() {
  clearInterval(dt); let left = 0, speed = 1; const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  app.innerHTML = `<section class="wrap"><h1>Live smart home demo</h1><p class="lead">A simulated dashboard. No real devices are connected.</p><div class="grid">${['Living room light', 'Bedroom light', 'Kitchen light'].map(n => `<div class="card"><b>${n}</b><br><button class="sw" role="switch" aria-checked="false" aria-label="${n}"></button><div class="lamp"></div></div>`).join('')}</div><div class="grid" style="margin-top:20px"><div class="card"><h3>Gas sensor</h3><button class="btn" id="gas">Simulate Gas Leak</button></div><div class="card"><h3>Smart door lock</h3><p id="ds"><b>Locked</b></p><button class="btn" id="unl">Unlock door</button> <button class="btn alt" id="fast">Speed up ×30</button></div><div class="card"><h3>Door camera</h3><button class="btn" id="unk">Unknown person at door</button></div></div></section>`;
  document.querySelectorAll('.sw').forEach(b => b.onclick = () => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); b.nextElementSibling.classList.toggle('on', on); });
  $('#gas').onclick = () => popup('<div class="alertbox"><h2 style="color:#c0392b">🔥 Gas leak detected</h2><p><b>SMS to owner:</b> "NexGen ALERT: Gas leak detected in Kitchen (412 PPM). Valve closed. Windows opening. Call 1906 if you smell gas."</p></div>');
  $('#unk').onclick = () => popup('<div class="alertbox"><h2 style="color:#c0392b">👤 Unknown person at the door</h2><p><b>Notification:</b> "NexGen: Unrecognised visitor at the front door, 10:42 PM. Tap to view camera."</p></div>');
  const paint = () => { $('#ds').innerHTML = left > 0 ? `<b>Unlocked</b> · auto-locks in ${fmt(left)}` : '<b>Locked</b>'; };
  $('#unl').onclick = () => { left = 300; paint(); };
  $('#fast').onclick = () => { speed = speed === 1 ? 30 : 1; $('#fast').textContent = speed === 1 ? 'Speed up ×30' : 'Normal speed'; };
  dt = setInterval(() => { if (!$('#ds')) return clearInterval(dt); if (left > 0) { left = Math.max(0, left - speed); paint(); if (!left) popup('<div class="alertbox"><h2>🔐 Door locked automatically</h2><p>The door was unlocked for more than 5 minutes, so NexGen locked it.</p></div>'); } }, 1000);
}

// ---- Admin panel (role = admin) ----
async function admin() {
  const d = await api('/admin/' + AT), TABS = ['orders', 'products', 'registrations', 'submissions', 'contact_messages'];
  const COLS = { orders: ['orderId', 'name', 'phone', 'address', 'items', 'total', 'status'], products: ['id', 'name', 'category', 'price', 'edit'], registrations: ['reg_id', 'name', 'email', 'phone', 'org', 'ticket', 'workshop'], submissions: ['id', 'title', 'category', 'team', 'link', 'email', 'status'], contact_messages: ['name', 'email', 'message', 'created'] }[AT];
  const ST = { orders: ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'], submissions: ['Submitted', 'Under Review', 'Accepted', 'Rejected'] }[AT];
  const cell = (r, c) => c === 'items' ? r.items.map(i => `${esc(i.name)} × ${i.qty}`).join('<br>') : c === 'status' ? `<select data-st="${r.id}" aria-label="Status">${ST.map(s => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('')}</select>` : c === 'edit' ? `<button class="btn alt sm" data-edit="${r.id}">Edit</button>` : c === 'total' || c === 'price' ? money(r[c]) : esc(r[c]);
  const e = EDIT && d.find(x => x.id == EDIT) || {};
  const pform = AT === 'products' ? `<h2>${e.id ? 'Edit' : 'Add'} product</h2><form id="pf">${inp('name', 'Name', 'text', e.name)}${sel('category', 'Category', ['Smart Lights', 'Smart Sensors', 'Smart Door Lock'], e.category)}${inp('price', 'Price (₹)', 'number', e.price, 'min="1"')}${inp('description', 'Description', 'text', e.description)}${inp('icon', 'Emoji icon', 'text', e.icon || '📦', 'maxlength="4"')}<button class="btn">${e.id ? 'Save changes' : 'Add product'}</button></form>` : '';
  app.innerHTML = `<section class="wrap"><h1>Admin panel</h1><p class="chips">${TABS.map(t => `<button class="chip${t === AT ? ' on' : ''}" data-tab="${t}">${t.replace('_', ' ')}</button>`).join('')}</p><div class="tw"><table><tr>${COLS.map(c => `<th>${c}</th>`).join('')}</tr>${d.map(r => `<tr>${COLS.map(c => `<td>${cell(r, c)}</td>`).join('')}</tr>`).join('')}</table></div>${pform}</section>`;
  if (pform) onForm('pf', async b => { await api('/admin/products' + (e.id ? '/' + e.id : ''), { method: e.id ? 'PUT' : 'POST', body: b }); EDIT = null; toast('Product saved'); P = await api('/products'); admin(); });
}

// ---- Router: hash -> view. Protected pages send guests to Sign In ----
const NEED = ['checkout', 'orders', 'profile', 'submit', 'myregs', 'admin'];
async function route() {
  const [name = '', arg] = location.hash.slice(2).split('/'); window.scrollTo(0, 0);
  if (name === 'logout') { S.user = S.token = null; S.cart = []; save(); toast('Signed out'); location.hash = '#/'; return; }
  if (NEED.includes(name) && !S.user) { S.next = location.hash; toast('Please sign in first', 1); location.hash = '#/login'; return; }
  if (name === 'admin' && S.user.role !== 'admin') { toast('Admins only', 1); location.hash = '#/'; return; }
  try {
    if (!P.length) P = await api('/products');
    const V = { '': home, features, summit, profile, contact, register, demo, cart, checkout, orders, products, schedule, speakers, submit, myregs, admin, login: () => authView(0), signup: () => authView(1), product: () => product(arg) };
    const v = V[name]; if (!v) { app.innerHTML = '<section class="wrap"><h1>Page not found</h1><a class="btn" href="#/">Go home</a></section>'; return; }
    app.onclick = null; const h = await v(); if (typeof h === 'string') app.innerHTML = h;
  } catch (x) { app.innerHTML = `<section class="wrap"><h1>Something went wrong</h1><p>${esc(x.message)}</p><a class="btn" href="#/">Go home</a></section>`; }
}

// ---- Global click handlers (event delegation) ----
document.addEventListener('click', e => {
  const t = e.target, g = s => t.closest(s);
  if (g('#burger')) { const o = $('#links').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); }
  else if (g('#links a')) $('#links').classList.remove('open');
  if (g('[data-add]')) addCart(g('[data-add]').dataset.add);
  if (g('[data-q]')) { const [id, d] = g('[data-q]').dataset.q.split(':'), c = S.cart.find(x => x.id == id); c.qty = Math.max(1, Math.min(20, c.qty + +d)); save(); syncCart(); cart(); }
  if (g('[data-rm]')) { S.cart = S.cart.filter(x => x.id != g('[data-rm]').dataset.rm); save(); syncCart(); cart(); }
  if (g('[data-day]')) { DAY = +g('[data-day]').dataset.day; schedule(); }
  if (g('[data-sp]')) { const s = SP.find(x => x.id == g('[data-sp]').dataset.sp); popup(`<h2>${esc(s.name)}</h2><p class="sm">${esc(s.role)}</p><p><b>${esc(s.topic)}</b></p><p>${esc(s.bio)}</p>`); }
  if (g('[data-tab]')) { AT = g('[data-tab]').dataset.tab; EDIT = null; admin(); }
  if (g('[data-edit]')) { EDIT = g('[data-edit]').dataset.edit; admin().then(() => $('#pf').scrollIntoView()); }
});
document.addEventListener('change', async e => { const s = e.target.closest('[data-st]'); if (!s) return; try { await api(`/admin/${AT}/${s.dataset.st}`, { method: 'PATCH', body: { status: s.value } }); toast('Status updated'); } catch (x) { toast(x.message, 1); } });

// Countdown to the Summit (updates every element marked data-cd)
setInterval(() => { const d = Math.max(0, new Date('2026-12-12T09:30:00+05:30') - Date.now()); document.querySelectorAll('[data-cd]').forEach(el => el.textContent = `${Math.floor(d / 864e5)} days ${Math.floor(d / 36e5 % 24)} h ${Math.floor(d / 6e4 % 60)} min ${Math.floor(d / 1e3 % 60)} s to go`); }, 1000);
window.addEventListener('hashchange', route); drawNav(); route();
