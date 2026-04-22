import os
from groq import Groq
from typing import List, Dict

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("Warning: GROQ_API_KEY missing.")
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile"  # Updated to current supported model

    def generate_answer(self, question: str, context_chunks: List[Dict]) -> Dict:
        """Generates an answer using RAG context."""
        context_text = "\n\n".join([f"Page {c.get('page', '?')}: {c.get('text', '')}" for c in context_chunks])
        
        prompt = f"""
        Answer the following question using ONLY the provided context. 
        If the answer is not in the context, say "I don't find this information in the notes."
        
        Context:
        {context_text}
        
        Question: {question}
        
        Instructions:
        - Give a clear and concise answer.
        - Cite your sources using [Page X] notation matching the page numbers in the context.
        - Do not hallucinate information.
        """
        
        completion = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            temperature=0.2,
        )
        
        return {
            "answer": completion.choices[0].message.content,
            "citations": list(set([f"Page {c.get('page', '?')}" for c in context_chunks]))
        }

    def generate_summary(self, chunks: List[Dict]) -> str:
        """Generates a summary of the provided chunks."""
        # For small docs, we just combine. For large, we'd need Map-Reduce.
        # We'll take a representative sample of chunks if too many.
        text_to_summarize = "\n".join([c.get("text", "") for c in chunks[:10]]) # Limit to first 10 chunks (~4000 tokens)
        
        prompt = f"""
        Summarize the following academic notes in a clear, structured way. 
        Use bullet points for key concepts.
        
        Notes:
        {text_to_summarize}
        """
        
        completion = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
        )
        
        return completion.choices[0].message.content

    def generate_mcqs(self, chunks: List[Dict]) -> List[Dict]:
        """Generates 5 multiple choice questions based on the notes."""
        text_to_use = "\n".join([c.get("text", "") for c in chunks[:8]])
        
        prompt = f"""
        Generate 5 high-quality Multiple Choice Questions (MCQs) based on the following text.
        Return ONLY a raw JSON array of objects with the following keys. Do not include markdown formatting.
        - question (string)
        - options (list of 4 strings)
        - correct_answer (string)
        - explanation (string: a brief 1-2 sentence explanation of why the answer is correct)
        - citation (string: e.g. "Page 5")
        
        Text:
        {text_to_use}
        """
        
        completion = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            response_format={"type": "json_object"}
        )
        
        import json
        import re
        
        try:
            content = completion.choices[0].message.content
            # Strip markdown formatting if the LLM leaked it despite instructions
            content = re.sub(r'```json', '', content)
            content = re.sub(r'```', '', content).strip()
            
            data = json.loads(content)
            # Handle potential nested 'mcqs' key or raw array
            if isinstance(data, dict):
                for key in data.keys():
                    if isinstance(data[key], list):
                        return data[key]
                return []
            return data if isinstance(data, list) else []
        except Exception as e:
            print(f"MCQ Generation Error: {e}")
            return []
