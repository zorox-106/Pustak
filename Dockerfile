# --- STAGE 1: Build the Frontend ---
FROM node:18-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Build the Backend ---
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:${PATH}"

WORKDIR /home/user/app

# Copy requirements and install
COPY --chown=user backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the backend code
COPY --chown=user backend/ .

# Copy the built frontend from Stage 1
COPY --from=frontend-build --chown=user /frontend/dist ./dist

# Expose the mandatory port for HF Spaces
EXPOSE 7860

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
