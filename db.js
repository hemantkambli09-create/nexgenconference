// Database layer: SQLite via Node's built-in node:sqlite (no compiler needed). Tables are created on start.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'data.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,email TEXT UNIQUE,phone TEXT,hash TEXT,role TEXT DEFAULT 'user');
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT,category TEXT,price INTEGER,description TEXT,icon TEXT);
CREATE TABLE IF NOT EXISTS carts(user_id INTEGER PRIMARY KEY,items TEXT);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,user_id INTEGER,name TEXT,phone TEXT,address TEXT,items TEXT,total INTEGER,status TEXT DEFAULT 'Placed',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS speakers(id INTEGER PRIMARY KEY,name TEXT,role TEXT,topic TEXT,bio TEXT);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY,day INTEGER,time TEXT,title TEXT,type TEXT,hall TEXT,speaker TEXT);
CREATE TABLE IF NOT EXISTS registrations(id INTEGER PRIMARY KEY,user_id INTEGER,reg_id TEXT,name TEXT,email TEXT,phone TEXT,org TEXT,ticket TEXT,workshop TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS submissions(id INTEGER PRIMARY KEY,user_id INTEGER,email TEXT,title TEXT,abstract TEXT,category TEXT,team TEXT,link TEXT,status TEXT DEFAULT 'Submitted',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS contact_messages(id INTEGER PRIMARY KEY,name TEXT,email TEXT,message TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);`);

// Sample content: replace with your real products, speakers and sessions
function seed(force) {
  const n = t => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  if (force) ['products', 'speakers', 'sessions'].forEach(t => db.exec(`DELETE FROM ${t}`));
  if (!n('products')) {
    const s = db.prepare('INSERT INTO products(name,category,price,description,icon) VALUES(?,?,?,?,?)');
    [
      ['NexGen Smart Bulb 9W RGB', 'Smart Lights', 799, 'Dimmable colour bulb with app, schedule and voice control.', '💡'],
      ['NexGen LED Strip 5m', 'Smart Lights', 1499, 'Cuttable colour strip for cove and under-cabinet lighting.', '✨'],
      ['NexGen Touch Switch Panel', 'Smart Lights', 2299, '3-gang touch panel that controls lights and fans from your phone.', '🎛️'],
      ['NexGen Gas Leak Sensor', 'Smart Sensors', 1899, 'Detects LPG and PNG leaks and sends an instant alert to the owner.', '🔥'],
      ['NexGen Motion Sensor', 'Smart Sensors', 1199, 'PIR sensor that triggers lights, alarms and routines.', '📡'],
      ['NexGen Door/Window Sensor', 'Smart Sensors', 899, 'Tells you the moment a door or window opens.', '🚪'],
      ['NexGen Keypad Door Lock', 'Smart Door Lock', 7999, 'PIN, app and key access. Auto-locks if left unlocked for 5 minutes.', '🔐'],
      ['NexGen Fingerprint Lock', 'Smart Door Lock', 11999, 'Fingerprint and PIN lock with unknown-visitor alerts.', '🖐️'],
      ['NexGen Retrofit Deadbolt', 'Smart Door Lock', 5499, 'Turns your existing deadbolt smart without changing the door.', '🗝️']
    ].forEach(r => s.run(...r));
  }
  if (!n('speakers')) {
    const s = db.prepare('INSERT INTO speakers(name,role,topic,bio) VALUES(?,?,?,?)');
    [
      ['Dr. Meera Iyer', 'Professor, Embedded Systems', 'Autonomous homes: from rules to learning', 'Researches adaptive control for residential energy and comfort.'],
      ['Arjun Deshmukh', 'IoT Architect, HomeGrid Labs', 'Designing secure device meshes', 'Builds low-power sensor networks for gas, smoke and water safety.'],
      ['Prof. Lena Fischer', 'Professor, Electronics', 'Edge AI on a 2-watt budget', 'Works on TinyML models that run directly on home sensors.'],
      ['Rohan Kulkarni', 'Founder, Nestwise', 'Smart safety for rented homes', 'Ships retrofit leak and gas detectors for apartments.'],
      ['Sara Okafor', 'Security Researcher', 'Smart home privacy by default', 'Audits consumer IoT devices and publishes open threat models.'],
      ['Dr. Kenji Mori', 'Principal Engineer, Lumen Systems', 'Smart cities start at home', 'Leads research on connecting homes to city energy grids.']
    ].forEach(r => s.run(...r));
  }
  if (!n('sessions')) {
    const s = db.prepare('INSERT INTO sessions(day,time,title,type,hall,speaker) VALUES(?,?,?,?,?,?)');
    [
      [1, '09:30', 'Inauguration and welcome', 'Ceremony', 'Hall A', ''],
      [1, '10:30', 'Keynote: Autonomous homes', 'Keynote', 'Hall A', 'Dr. Meera Iyer'],
      [1, '14:00', 'Designing secure device meshes', 'Talk', 'Hall B', 'Arjun Deshmukh'],
      [2, '10:00', 'Edge AI on a 2-watt budget', 'Talk', 'Hall A', 'Prof. Lena Fischer'],
      [2, '12:00', 'Smart safety for rented homes', 'Talk', 'Hall B', 'Rohan Kulkarni'],
      [2, '14:30', 'Workshop: Build a gas-leak alert node', 'Workshop', 'Lab 1', ''],
      [3, '10:00', 'Smart home privacy by default', 'Talk', 'Hall A', 'Sara Okafor'],
      [3, '11:30', 'Smart cities start at home', 'Talk', 'Hall A', 'Dr. Kenji Mori'],
      [3, '14:00', 'Project showcase and judging', 'Showcase', 'Atrium', ''],
      [3, '16:30', 'Awards and closing', 'Ceremony', 'Hall A', '']
    ].forEach(r => s.run(...r));
  }
}
module.exports = { db, seed };
