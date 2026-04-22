# 🚀 Pustak Deployment Guide

This guide will walk you through deploying both the **Frontend** and **Backend** of Pustak.

## 1. Backend Deployment (FastAPI)
We recommend using **Render** or **Railway** for the backend.

### Option A: Render (Recommended)
1.  **Create a New Web Service**: Connect your GitHub repository.
2.  **Build Command**: `pip install -r backend/requirements.txt`
3.  **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4.  **Environment Variables**: Add the following in the Render Dashboard:
    -   `GROQ_API_KEY`: Your Groq API Key
    -   `QDRANT_URL`: Your Qdrant Cloud URL
    -   `QDRANT_API_KEY`: Your Qdrant API Key
    -   `JWT_SECRET`: A long random string (e.g., `openssl rand -hex 32`)
5.  **Persistence (Optional but Recommended)**:
    -   Since the app uses SQLite (`pustak.db`), you should add a **Render Disk** to prevent data loss on every deploy.
    -   Mount it at `/data` and update `main.py` to use `/data/pustak.db`.

---

## 2. Frontend Deployment (React/Vite)
We recommend **Vercel** or **Netlify**.

### Option A: Vercel
1.  **Import Project**: Connect your GitHub repository.
2.  **Framework Preset**: Vite
3.  **Root Directory**: `frontend`
4.  **Build Command**: `npm run build`
5.  **Output Directory**: `dist`
6.  **Environment Variables**:
    -   Update the `baseURL` in `frontend/src/api/client.js` to point to your deployed Backend URL (e.g., `https://pustak-backend.onrender.com/api`).

---

## 3. Database Strategy
-   **SQLite**: Great for starting out. If you deploy to a platform without persistent storage, your users/notes will be deleted when the server restarts.
-   **PostgreSQL**: For a production-ready app, consider switching the SQLite code in `main.py` to PostgreSQL (Render and Railway offer free managed Postgres).

---

## 4. Production Checklist
- [ ] Change `JWT_SECRET` to a secure 32-byte string.
- [ ] Ensure CORS settings in `main.py` allow your Frontend domain.
- [ ] Update `client.js` with the correct production API URL.
- [ ] Set `PYTHON_VERSION` to `3.12` in your deployment settings.

---

## 5. Troubleshooting
-   **CORS Error**: If the frontend can't talk to the backend, check the `allow_origins` list in `backend/app/main.py`. Change it from `["*"]` to your specific frontend URL for better security.
-   **Vector Search 400 Error**: Ensure your Qdrant Cloud collection is active and the API Key is correct.
