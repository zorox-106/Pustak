# Pustak AI 📚

Pustak (Hindi for "Book") is an advanced AI-powered academic assistant that helps students manage their notes, generate summaries, chat with their documents, and test their knowledge with AI-generated quizzes.

## ✨ Features

- **Multi-Note Management**: Upload and organize multiple PDF notes in a sleek sidebar.
- **AI Chat (RAG)**: Ask questions about your notes and get precise answers with page citations.
- **Smart Summaries**: Get instant, structured summaries of your long academic documents.
- **Knowledge Checks**: Generate fresh multiple-choice quizzes (MCQs) whenever you want to test yourself.
- **Student Profile**: Track your academic details and set future learning goals.
- **Premium UI**: Modern, dark-mode-ready interface with smooth animations and responsive design.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Lucide Icons, Tailwind-like Vanilla CSS.
- **Backend**: FastAPI (Python), SQLite.
- **AI/ML**: Groq (Llama 3.1 70B), Qdrant Cloud (Vector Database).
- **Authentication**: JWT-based secure login/signup.

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq API Key
- Qdrant Cloud URL & API Key

### Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
4. `pip install -r requirements.txt`
5. Create a `.env` file with:
   ```env
   GROQ_API_KEY=your_key
   QDRANT_URL=your_url
   QDRANT_API_KEY=your_key
   JWT_SECRET=your_secret
   ```
6. `uvicorn app.main:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 📄 License
MIT
