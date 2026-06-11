# syntax=docker/dockerfile:1.7
# MouseAI Code Interpreter with WeasyPrint and Editorial Fonts
# Supports: Python code execution, PDF generation, data visualization

FROM python:3.12-slim-bookworm

ARG DEBIAN_FRONTEND=noninteractive

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# ============================================
# System dependencies for WeasyPrint + fonts
# ============================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # WeasyPrint dependencies
    libcairo2 libcairo2-dev \
    libpango1.0-0 libpango1.0-dev \
    libgdk-pixbuf-2.0-0 libgdk-pixbuf2.0-dev \
    libffi-dev \
    shared-mime-info \
    # Image processing
    libjpeg62-turbo-dev libpng-dev libtiff-dev libopenjp2-7 \
    libfreetype6-dev liblcms2-dev libwebp-dev \
    # Base fonts + EB Garamond from Debian
    fontconfig fonts-liberation fonts-dejavu-core fonts-ebgaramond \
    # Misc
    curl ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Install Cormorant Garamond + Cinzel from GitHub google-fonts mirror
# ============================================
RUN mkdir -p /usr/share/fonts/truetype/editorial && \
    # Cormorant Garamond (Regular = 400)
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/Cormorant-Regular.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cormorant-Regular.ttf && \
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/Cormorant-Medium.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cormorant-Medium.ttf && \
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/Cormorant-SemiBold.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cormorant-SemiBold.ttf && \
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/Cormorant-Bold.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cormorant-Bold.ttf && \
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/Cormorant-Italic.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cormorant-Italic.ttf && \
    # Cinzel
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel-Regular.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cinzel-Regular.ttf && \
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel-SemiBold.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cinzel-SemiBold.ttf && \
    curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel-Bold.ttf" \
        -o /usr/share/fonts/truetype/editorial/Cinzel-Bold.ttf && \
    fc-cache -f

# ============================================
# Python dependencies
# ============================================
WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-compile -r /app/requirements.txt

# ============================================
# Application code
# ============================================
COPY src/ /app/src/

# Create workspace directory
RUN mkdir -p /workspace && chmod 777 /workspace

# Non-root user for code execution
RUN addgroup --gid 1001 coderunner && \
    adduser --uid 1001 --gid 1001 --disabled-password --gecos "" coderunner && \
    chown -R coderunner:coderunner /workspace

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    WORKSPACE_DIR=/workspace \
    HOST=0.0.0.0 \
    PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
