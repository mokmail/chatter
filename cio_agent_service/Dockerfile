FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /root/.cio-intelligence-hub

ENV CIO_TARGET_DIR=/workspace
ENV CIO_AGENT_PORT=8001
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["python", "main.py"]