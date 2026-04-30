FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for chromadb, torch, and unstructured
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    cmake \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create the data directory for persistence
RUN mkdir -p /root/.cio-intelligence-hub

EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
