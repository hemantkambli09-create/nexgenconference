# NexGen: Smart Home Store + Smart Living Summit 2026

Express REST API + SQLite (Node's built-in `node:sqlite`) + vanilla JS single-page frontend. Needs **Node 22.13+**.

## Features
Store: products with category filter and search, product page, cart saved in the database, checkout (Cash on Delivery), orders. Summit: about with countdown, schedule, speakers, registration with ID, project submission with status tracking, contact with FAQ. Plus sign up / login (bcrypt + JWT), live smart-home demo, and an admin panel.

## Run locally
```bash
npm install
copy .env.example .env      # Mac/Linux: cp .env.example .env  (then edit .env)
npm start
```
Open http://localhost:3000. Admin login: `admin@nexgen.com` / `Admin@123` (change in `.env`). `npm run seed` resets sample products, speakers and sessions.

## Email (Nodemailer + Gmail)
Turn on 2-step verification on the Gmail account, create an **App Password**, and put it in `.env` as `SMTP_PASS` with `SMTP_USER`. Order, registration and submission emails go to `NOTIFY_EMAIL` (stark991101@gmail.com) and to the customer. Without SMTP settings, emails are printed in the terminal.

## GitHub
Create a repo, upload everything except `node_modules` and `.env` (`.gitignore` already skips them).

## Deploy (Render, one service for frontend + backend)
New → Web Service → pick the repo. Build `npm install`, start `npm start`. Add env vars: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NOTIFY_EMAIL`, `SMTP_USER`, `SMTP_PASS`, `NODE_VERSION=22.14.0`. For data that survives restarts, add a disk at `/var/data` and set `DB_PATH=/var/data/data.db`.

## Code map
`db.js` tables + sample data · `server.js` API, auth, email, admin · `public/app.js` pages, router, cart, admin UI · `public/index.html` layout and styles.
