FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# App code
COPY main.py .

# LoRA adapter (mount or bake in during build)
# COPY gspl-agent-lora/ ./gspl-agent-lora/

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["python3", "main.py"]
