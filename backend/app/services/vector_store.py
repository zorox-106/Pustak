import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import uuid

class VectorStore:
    def __init__(self):
        # Use Qdrant Cloud credentials from environment variables
        self.url = os.getenv("QDRANT_URL", "").strip()
        self.api_key = os.getenv("QDRANT_API_KEY", "").strip()
        
        self.use_cloud = bool(self.url and self.api_key)
        
        # Initialize the client with robust fallback
        if self.use_cloud:
            try:
                print(f"⏳ Attempting to connect to Qdrant Cloud: {self.url}")
                self.client = QdrantClient(url=self.url, api_key=self.api_key)
                self.client.get_collections() # Test connection immediately
                print("✅ Successfully connected to Qdrant Cloud!")
            except Exception as e:
                print(f"❌ Qdrant Cloud connection failed: {str(e)}")
                print("⚠️ Falling back to local :memory: storage.")
                self.use_cloud = False
                
        if not self.use_cloud:
            self.client = QdrantClient(":memory:")
            print("🚀 Using Local In-Memory Qdrant (Ephemeral).")
            
        # Load embedding model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.collection_name = "student_notes"
        
        # Create collection if it doesn't exist
        self._ensure_collection()

    def _ensure_collection(self):
        collections = self.client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)
        
        if not exists:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
            )
        
        # Ensure payload index for filtering by document_id exists
        try:
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        except Exception:
            # Index might already exist
            pass

    def upsert_chunks(self, document_id: str, chunks: List[Dict]):
        """Embeds and stores chunks in Qdrant."""
        texts = [c["text"] for c in chunks]
        embeddings = self.model.encode(texts)
        
        points = [
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding.tolist(),
                payload={"text": chunk["text"], "page": chunk["page"], "document_id": document_id, "chunk_index": i}
            )
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

    def search(self, query: str, document_id: str, top_k: int = 4) -> List[Dict]:
        """Searches for relevant chunks for a specific document."""
        query_vector = self.model.encode(query).tolist()
        
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=document_id)
                    )
                ]
            ),
            limit=top_k
        )
        
        return [hit.payload for hit in search_result]

    def delete_document(self, document_id: str):
        """Deletes all points associated with a document ID."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=document_id)
                    )
                ]
            )
        )
