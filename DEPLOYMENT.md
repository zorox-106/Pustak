# 🚀 Pustak Deployment Guide

This guide covers deployment for Pustak on various platforms.

## 1. Hugging Face Spaces (Recommended - Free & Permanent)
Hugging Face Spaces is great because it's free and won't expire. It uses Docker to run both your frontend and backend together.

1.  **Create a New Space**:
    -   Go to [Hugging Face Spaces](https://huggingface.co/new-space).
    -   Select **Docker** as the SDK.
    -   Choose the **Blank** template.
2.  **Upload Your Files**:
    -   Push your code to the Space's repository (or connect your GitHub).
    -   The `Dockerfile` in the root will automatically build both the React frontend and FastAPI backend.
3.  **Set Secrets**:
    -   Go to **Settings** -> **Variables and secrets**.
    -   Add: `GROQ_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `JWT_SECRET`.
4.  **Access Your App**:
    -   Once the build finishes, your app will be live at `https://huggingface.co/spaces/YOUR_USER/YOUR_SPACE`.

---

## 2. Other Platforms (Render / Railway)
If you prefer separate deployment:

### Backend (Render)
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Persistence**: Add a **Render Disk** to keep your `pustak.db` alive.

### Frontend (Vercel)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## 3. Production Checklist
- [ ] **API URL**: If running separately, ensure `frontend/src/api/client.js` points to your backend URL. If on Hugging Face, it uses `/api` (relative) which is already configured.
- [ ] **JWT Secret**: Use a long random string.
- [ ] **CORS**: Update `backend/app/main.py` if needed (default is `*` which works but is less secure).

---

## 📄 Important Note on Storage
Hugging Face Spaces are ephemeral by default. If you want your `pustak.db` to survive a restart, you should enable **Persistent Storage** in your Space settings (requires a small fee or a "Community" grant). Otherwise, users will need to re-signup if the Space restarts.
