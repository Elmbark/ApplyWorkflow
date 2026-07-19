# Stage 1: Build the React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Final Python Image
FROM python:3.11-slim

# Install system dependencies (wget/xz-utils for typst)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Download and install typst (v0.11.1)
RUN wget -qO- https://github.com/typst/typst/releases/download/v0.15.0/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar -xJ --strip-components=1 -C /usr/local/bin typst-x86_64-unknown-linux-musl/typst

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY api/ api/
COPY src/ src/
COPY templates/ templates/
COPY run_api.py .

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose FastAPI port
EXPOSE 8000

# Run the API server
CMD ["python", "run_api.py", "--host", "0.0.0.0", "--port", "8000", "--no-reload"]
