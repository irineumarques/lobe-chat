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
    # Font utilities
    fontconfig fonts-liberation \
    # Misc
    curl wget ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Install Editorial Fonts:
# - EB Garamond (Google Fonts)
# - Cormorant Garamond (Google Fonts)
# - Cinzel (Google Fonts)
# ============================================
RUN mkdir -p /usr/share/fonts/truetype/editorial && \
    # EB Garamond
    wget -q "https://fonts.google.com/download?family=EB+Garamond" -O /tmp/eb-garamond.zip && \
    unzip -o /tmp/eb-garamond.zip -d /usr/share/fonts/truetype/editorial/ && \
    # Cormorant Garamond
    wget -q "https://fonts.google.com/download?family=Cormorant+Garamond" -O /tmp/cormorant.zip && \
    unzip -o /tmp/cormorant.zip -d /usr/share/fonts/truetype/editorial/ && \
    # Cinzel
    wget -q "https://fonts.google.com/download?family=Cinzel" -O /tmp/cinzel.zip && \
    unzip -o /tmp/cinzel.zip -d /usr/share/fonts/truetype/editorial/ && \
    # Clean up and rebuild font cache
    rm -f /tmp/*.zip && \
    fc-cache -f -v

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
