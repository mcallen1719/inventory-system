<div align="center">
<img width="1200" height="475" alt="Barry Dev Banner" src="./barry-dev.png" />
</div>

# Printopia Digital Press - Inventory & Order Management

A real-time multi-user inventory, job tracking, and printing order management system with live sync across all connected computers.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Run the app:
   ```
   npm run dev
   ```
3. Open http://localhost:3000 in your browser

## Deploy to Cloud (No Server PC Needed)

Deploy this app to [Render](https://render.com) in one click:

1. Push this project to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Render auto-detects `render.yaml` and deploys both frontend and sync server
6. Your app will be live at `https://your-app-name.onrender.com`

**What you get:**
- No physical server PC needed
- 24/7 online sync server (Render free tier)
- Multiple computers connect via the pairing modal on first launch
- Real-time updates across all users

## Connect Multiple Computers

After deploying to Render (or running locally):

1. Open the app on the **first computer** and select **"Yes, I'm the Main PC"** in the pairing modal
2. On **other computers**, select **"No, Connect Me"** and enter the main PC's address
   - If deployed to Render: `https://your-app-name.onrender.com`
   - If running locally: `http://192.168.1.50:3000` (the server's LAN IP)
3. Click **Test & Connect**, then **Continue**
4. All computers now sync in real-time

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + Socket.IO
- Sync: Real-time WebSocket broadcast to all connected clients
- Storage: Browser localStorage with server-side `db.json` persistence

## Features

- General Printing Orders (M1)
- Custom Job Intake & Kanban (M2/M3)
- End of Shift Sales Reports (M4)
- Daily Miscellaneous Expenses (M5)
- SKU Inventory Management (M6)
- Expenditure Tracking
- Staff Late Arrival Notes
- Audit Logs & Backups
- Real-time multi-computer sync
