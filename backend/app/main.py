import os
import uuid
import sqlite3
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict

# Load environment variables
load_dotenv()

from app.services.document_processor import DocumentProcessor
from app.services.vector_store import VectorStore
from app.services.llm_service import LLMService
from app.services.auth_service import get_current_user, get_password_hash, verify_password, create_access_token

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

doc_processor = DocumentProcessor()
vector_store = VectorStore()
llm_service = LLMService()

# Cache for document chunks (for summary/mcq)
doc_cache = {}

class ChatRequest(BaseModel):
    question: str

class AuthRequest(BaseModel):
    username: str
    password: str

class ProfileUpdate(BaseModel):
    full_name: str = ""
    college: str = ""
    year: str = ""
    goals: str = ""

def init_db():
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, hashed_password TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS documents
                 (id TEXT PRIMARY KEY, user_id INTEGER, file_name TEXT, FOREIGN KEY(user_id) REFERENCES users(id))''')
    c.execute('''CREATE TABLE IF NOT EXISTS profiles
                 (user_id INTEGER PRIMARY KEY, full_name TEXT, college TEXT, year TEXT, goals TEXT, 
                  FOREIGN KEY(user_id) REFERENCES users(id))''')
    conn.commit()
    conn.close()

init_db()

@app.post("/api/signup")
async def signup(req: AuthRequest):
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    try:
        hashed = get_password_hash(req.password)
        c.execute("INSERT INTO users (username, hashed_password) VALUES (?, ?)", (req.username, hashed))
        conn.commit()
        return {"message": "User created"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()

@app.post("/api/login")
async def login(req: AuthRequest):
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    c.execute("SELECT id, hashed_password FROM users WHERE username = ?", (req.username,))
    user = c.fetchone()
    conn.close()
    
    if not user or not verify_password(req.password, user[1]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": req.username, "id": user[0]})
    return {"token": token, "username": req.username}

@app.get("/api/documents")
async def get_documents(user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    c.execute("SELECT id, file_name FROM documents WHERE user_id = ?", (user["id"],))
    docs = [{"doc_id": r[0], "file_name": r[1]} for r in c.fetchall()]
    conn.close()
    return docs

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    
    # Verify ownership
    c.execute("SELECT id FROM documents WHERE id = ? AND user_id = ?", (doc_id, user["id"]))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Delete from SQLite
    c.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    
    # Delete from Vector Store
    vector_store.delete_document(doc_id)
    
    # Clear cache
    if doc_id in doc_cache:
        del doc_cache[doc_id]
        
    return {"message": "Document deleted"}

@app.get("/api/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    c.execute("SELECT full_name, college, year, goals FROM profiles WHERE user_id = ?", (user["id"],))
    row = c.fetchone()
    conn.close()
    
    if row:
        return {"full_name": row[0], "college": row[1], "year": row[2], "goals": row[3]}
    return {"full_name": "", "college": "", "year": "", "goals": ""}

@app.post("/api/profile")
async def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("pustak.db")
    c = conn.cursor()
    c.execute('''INSERT OR REPLACE INTO profiles (user_id, full_name, college, year, goals) 
                 VALUES (?, ?, ?, ?, ?)''', 
              (user["id"], req.full_name, req.college, req.year, req.goals))
    conn.commit()
    conn.close()
    return {"message": "Profile updated"}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    temp_path = f"temp_{doc_id}.pdf"
    
    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)
    
    try:
        # Extract and Split with pages
        chunks = doc_processor.extract_and_split(temp_path)
        
        # Store in Vector DB
        vector_store.upsert_chunks(doc_id, chunks)
        
        # Cache chunks for summary/mcq
        doc_cache[doc_id] = chunks
        
        # Save to SQLite
        conn = sqlite3.connect("pustak.db")
        c = conn.cursor()
        c.execute("INSERT INTO documents (id, user_id, file_name) VALUES (?, ?, ?)", (doc_id, user["id"], file.filename))
        conn.commit()
        conn.close()
        
        return {"doc_id": doc_id, "message": "Document processed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/api/summary/{doc_id}")
async def get_summary(doc_id: str, user: dict = Depends(get_current_user)):
    if doc_id not in doc_cache:
        raise HTTPException(status_code=404, detail="Document not found or processed.")
    
    summary = llm_service.generate_summary(doc_cache[doc_id])
    return {"summary": summary}


@app.get("/api/mcqs/{doc_id}")
async def get_mcqs(doc_id: str, user: dict = Depends(get_current_user)):
    if doc_id not in doc_cache:
        raise HTTPException(status_code=404, detail="Document not found or processed.")
    
    # Force a fresh generation
    mcqs = llm_service.generate_mcqs(doc_cache[doc_id])
    return {"mcqs": mcqs}

@app.post("/api/chat/{doc_id}")
async def chat(doc_id: str, req: ChatRequest, user: dict = Depends(get_current_user)):
    try:
        # Search relevant chunks
        relevant_chunks = vector_store.search(req.question, doc_id)
        
        if not relevant_chunks:
            return {"answer": "I couldn't find any relevant information in the notes.", "citations": []}
        
        # Generate answer passing the full relevant_chunks containing text and page info
        result = llm_service.generate_answer(req.question, relevant_chunks)
        return result
    except Exception as e:
        print(f"❌ Chat Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Mount frontend static files
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")
