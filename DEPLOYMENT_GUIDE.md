# IWMS Free Deployment Guide

Follow these steps to deploy your Inventory & Warehouse Management System for free.

## Prerequisites
- A [GitHub](https://github.com) account with your code pushed to a repository.
- Accounts for [Neon](https://neon.tech), [Upstash](https://upstash.com), [Render](https://render.com), and [Vercel](https://vercel.com).

---

## Step 1: Database (Neon)
1. Sign up at [Neon.tech](https://neon.tech).
2. Create a new project named `iwms`.
3. Select **Postgres 15** (matches your local version).
4. From the Dashboard, copy the **Connection String** (it starts with `postgres://...`).
5. **Keep this URL handy.**

## Step 2: Set up Upstash (Redis)
- Go to [Upstash Console](https://console.upstash.com/).
- Create a new **Redis** database.
- **IMPORTANT**: On your database dashboard, click the **TCP** tab (not the REST tab).
- Look for the **Node.js** connection snippet or the **Connection String**.
- Your URL should look like: `rediss://default:yourpassword@your-host.upstash.io:6379`
- Copy this string.
4. From the Dashboard, copy the **Redis URL** (under the "Connect" section).
5. **Keep this URL handy.**

## Step 3: Backend (Render)
1. Sign up at [Render.com](https://render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file.
5. It will ask for several environment variables:
    - `DATABASE_URL`: Paste the Neon string from Step 1.
    - `REDIS_URL`: Paste the Upstash URL from Step 2.
    - `CLIENT_URL`: Leave this as a placeholder for now (e.g., `https://temp.vercel.app`), we will update it after Step 4.
    - `GOOGLE_CLIENT_ID`: (Optional) Paste your Google OAuth Client ID if you want SSO.
    - `GOOGLE_CLIENT_SECRET`: (Optional) Paste your Google OAuth Client Secret if you want SSO.
    - *If you don't need SSO yet, you can leave the Google fields empty.*
6. Click **Apply**.
7. **Finding the URL**: 
    - Once you click Apply, Render will create a new **Web Service** named `iwms-backend`.
    - Go to your main **Dashboard** in Render.
    - Click on the service named **iwms-backend**.
    - The URL is located at the top left of the page (e.g., `https://iwms-backend.onrender.com`).
    - **Keep this URL handy.**

## Step 4: Frontend (Vercel)
1. Sign up at [Vercel.com](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. **IMPORTANT**: In the "Root Directory" setting, click **Edit** and select the `frontend` folder.
5. In **Environment Variables**, add:
    - `REACT_APP_API_URL`: Your Render backend URL (from Step 3).
6. Click **Deploy**.
7. Once finished, copy your Vercel URL (e.g., `https://iwms-frontend.vercel.app`).

## Step 5: Final Link
1. Go back to your **Render** dashboard for the backend service.
2. Go to **Environment**.
3. Update `CLIENT_URL` with your actual Vercel URL (from Step 4).
4. Save changes. Render will redeploy automatically.

---
**Your app is now live!**
