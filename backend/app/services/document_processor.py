import fitz  # PyMuPDF
import re
from typing import List, Dict

class DocumentProcessor:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_and_split(self, file_path: str) -> List[Dict]:
        """Extracts text from PDF and splits into chunks preserving page numbers."""
        chunks = []
        try:
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                text = page.get_text()
                # Clean text
                text = re.sub(r'\s+', ' ', text).strip()
                
                # Split this page's text into chunks
                start = 0
                while start < len(text):
                    end = start + self.chunk_size
                    chunk = text[start:end]
                    if len(chunk) > 10: # Only keep meaningful chunks
                        chunks.append({"text": chunk, "page": page_num + 1})
                    start += self.chunk_size - self.chunk_overlap
            doc.close()
        except Exception as e:
            print(f"Error processing document: {e}")
            
        return chunks

# Example usage:
# processor = DocumentProcessor()
# text = processor.extract_text("notes.pdf")
# chunks = processor.split_text(text)
