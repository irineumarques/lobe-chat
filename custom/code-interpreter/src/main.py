#!/usr/bin/env python3
"""
MouseAI Code Interpreter - FastAPI Server
Executes Python code in isolated environments with PDF generation support.
"""

import asyncio
import hashlib
import json
import logging
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator

import boto3
import io

# PDF generation with WeasyPrint
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    HTML = None
import redis.asyncio as redis
from botocore.config import Config as BotoConfig
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('mouseai-code-interpreter')

# Configuration from environment
API_KEY = os.getenv('API_KEY', 'iris-code-5c6f96e6fd08')
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'GKminioadmin0000')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadminsecret')
S3_BUCKET = os.getenv('S3_BUCKET', 'mouseai')
MAX_EXECUTION_TIME = int(os.getenv('MAX_EXECUTION_TIME', '60'))
MAX_OUTPUT_SIZE = int(os.getenv('MAX_OUTPUT_SIZE', '500000'))

# S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    config=BotoConfig(signature_version='s3v4'),
)

# Redis client
redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return redis_client


class ExecutionRequest(BaseModel):
    code: str
    language: str = 'python'
    session_id: str | None = None
    timeout: int = MAX_EXECUTION_TIME
    working_dir: str | None = None


class ExecutionResponse(BaseModel):
    session_id: str
    success: bool
    stdout: str
    stderr: str
    execution_time: float
    artifacts: list[dict[str, Any]]


class PDFGenerationRequest(BaseModel):
    content: str
    title: str | None = None
    format: str = 'html'  # 'html' or 'markdown'
    font_family: str = 'EB Garamond'
    font_size: int = 11
    page_size: str = 'A4'
    margin_top: float = 2.5
    margin_bottom: float = 2.5
    margin_left: float = 2.5
    margin_right: float = 2.5
    base_url: str | None = None


class PDFGenerationResponse(BaseModel):
    success: bool
    file_id: str
    file_name: str
    file_size: int
    download_url: str
    content_type: str = 'application/pdf'


def validate_code(code: str) -> tuple[bool, str]:
    """Validate code for security concerns."""
    dangerous_patterns = [
        r'import\s+os\s*;?\s*os\.system',
        r'import\s+subprocess\s*;?\s*subprocess\.run',
        r'import\s+subprocess\s*;?\s*subprocess\.call',
        r'import\s+subprocess\s*;?\s*subprocess\.Popen',
        r'__import__\s*\(',
        r'eval\s*\(',
        r'exec\s*\(',
        r'open\s*\([^|]+[\'"]\/',
        r'os\.chdir',
        r'os\.chmod',
        r'os\.chown',
        r'os\.remove',
        r'os\.rmdir',
        r'os\.unlink',
        r'shutil\.rmtree',
        r'shutil\.move',
        r'shutil\.copy',
        r'sys\.exit',
        r'os\.kill',
        r'os\.execl',
        r'os\.execv',
        r'os\.popen',
        r'fork\s*\(',
        r'spawn\s*\(',
    ]

    for pattern in dangerous_patterns:
        if re.search(pattern, code, re.IGNORECASE):
            return False, f'Forbidden pattern detected: {pattern}'

    return True, ''


async def execute_python(code: str, timeout: int, session_id: str) -> tuple[str, str, float]:
    """Execute Python code and return stdout, stderr, execution_time."""
    start_time = time.time()

    # Create a temporary directory for execution
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write code to file
        code_file = Path(tmpdir) / 'script.py'
        code_file.write_text(code, encoding='utf-8')

        # Create output directory
        output_dir = Path(tmpdir) / 'output'
        output_dir.mkdir(exist_ok=True)

        # Environment variables
        env = {
            'PYTHONUNBUFFERED': '1',
            'PYTHONDONTWRITEBYTECODE': '1',
            'HOME': tmpdir,
            'TMPDIR': tmpdir,
        }

        try:
            result = subprocess.run(
                ['python3', '-u', str(code_file)],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=tmpdir,
                env={**os.environ, **env},
 )

            execution_time = time.time() - start_time

            # Check for generated files
            artifacts = []
            for f in output_dir.iterdir():
                if f.is_file():
                    artifact = await upload_artifact(f, session_id)
                    if artifact:
                        artifacts.append(artifact)

            return result.stdout, result.stderr, execution_time

        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            return '', f'Execution timed out after {timeout} seconds', execution_time
        except Exception as e:
            execution_time = time.time() - start_time
            return '', f'Execution error: {str(e)}', execution_time


async def generate_pdf(
    content: str,
    title: str | None,
    font_family: str,
    font_size: int,
    page_size: str,
    margin_top: float,
    margin_bottom: float,
    margin_left: float,
    margin_right: float,
    content_format: str = 'html',
) -> tuple[bytes, str]:
    """Convert HTML/Markdown content to PDF using WeasyPrint."""

    # Convert markdown to HTML if needed
    if content_format == 'markdown':
        try:
            import markdown
            content = markdown.markdown(
                content,
                extensions=['tables', 'fenced_code', 'codehilite', 'toc'],
                extension_configs={
                    'toc': {'title': 'Table of Contents'},
                }
            )
        except ImportError:
            # Fallback: try mistune
            try:
                import mistune
                md = mistune.create_markdown(plugins=['table'])
                content = md(content)
            except ImportError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail='Markdown library not available. Please use HTML content.',
                )

    # Check if WeasyPrint is available
    if not WEASYPRINT_AVAILABLE or HTML is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='WeasyPrint is not available in this environment',
        )

    # Default CSS for editorial typography
    default_css = f'''
    @font-face {{
        font-family: 'EB Garamond';
        src: url('https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-Regular.ttf');
        font-weight: normal;
        font-style: normal;
    }}
    @font-face {{
        font-family: 'EB Garamond';
        src: url('https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-Italic.ttf');
        font-weight: normal;
        font-style: italic;
    }}
    @font-face {{
        font-family: 'EB Garamond';
        src: url('https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-Bold.ttf');
        font-weight: bold;
        font-style: normal;
    }}
    @font-face {{
        font-family: 'Cormorant Garamond';
        src: url('https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/Cormorant-Regular.ttf');
        font-weight: normal;
        font-style: normal;
    }}
    @font-face {{
        font-family: 'Cinzel';
        src: url('https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel-Regular.ttf');
        font-weight: normal;
        font-style: normal;
    }}

    :root {{
        --font-body: '{font_family}', 'EB Garamond', Georgia, serif;
        --font-heading: 'Cormorant Garamond', 'EB Garamond', Georgia, serif;
        --font-title: 'Cinzel', 'EB Garamond', Georgia, serif;
    }}

    body {{
        font-family: var(--font-body);
        font-size: {font_size}pt;
        line-height: 1.6;
        color: #1a1a1a;
        margin: 0;
        padding: 0;
    }}

    h1 {{
        font-family: var(--font-title);
        font-size: 18pt;
        font-weight: bold;
        color: #1e1b4b;
        border-bottom: 2px solid #6366f1;
        padding-bottom: 8px;
        margin-bottom: 16px;
        text-align: center;
    }}

    h2 {{
        font-family: var(--font-heading);
        font-size: 14pt;
        font-weight: bold;
        color: #3730a3;
        margin-top: 24px;
        margin-bottom: 12px;
    }}

    h3 {{
        font-family: var(--font-heading);
        font-size: 12pt;
        font-weight: bold;
        color: #4338ca;
        margin-top: 18px;
        margin-bottom: 8px;
    }}

    p {{
        text-align: justify;
        margin-bottom: 12px;
        orphans: 3;
        widows: 3;
    }}

    code, pre {{
        font-family: 'Courier New', monospace;
        font-size: 9pt;
        background-color: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
    }}

    pre {{
        background-color: #f0f0f0;
        padding: 12px;
        overflow: auto;
        page-break-inside: avoid;
    }}

    blockquote {{
        border-left: 4px solid #6366f1;
        padding-left: 16px;
        margin-left: 0;
        color: #4b5563;
        font-style: italic;
    }}

    table {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
    }}

    th {{
        background-color: #6366f1;
        color: white;
        padding: 8px;
        text-align: left;
    }}

    td {{
        padding: 6px 8px;
        border-bottom: 1px solid #e5e7eb;
    }}

    tr:nth-child(even) {{
        background-color: #f9fafb;
    }}

    img {{
        max-width: 100%;
        height: auto;
    }}

    a {{
        color: #6366f1;
    }}

    ul, ol {{
        margin-bottom: 12px;
    }}

    li {{
        margin-bottom: 4px;
    }}

    hr {{
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 20px 0;
    }}
    '''

    # Wrap content in full HTML document
    title_text = title or 'Document'
    html_content = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>{title_text}</title>
</head>
<body>
{content}
</body>
</html>'''

    # Generate PDF with WeasyPrint
    html_obj = HTML(string=html_content)
    pdf_bytes = html_obj.write_pdf(
        stylesheets=[
            HTML(string=f'<style>{default_css}</style>'),
        ],
        presentational_hints=True,
    )

    file_name = f"{title or 'document'}.pdf"
    return pdf_bytes, file_name


async def upload_artifact(file_path: Path, session_id: str) -> dict[str, Any] | None:
    """Upload a file artifact to S3."""
    try:
        key = f'sessions/{session_id}/artifacts/{file_path.name}'
        s3_client.upload_file(str(file_path), S3_BUCKET, key)
        url = f'{S3_ENDPOINT}/{S3_BUCKET}/{key}'
        return {
            'name': file_path.name,
            'type': file_path.suffix.lstrip('.'),
            'size': file_path.stat().st_size,
            'url': url,
        }
    except Exception as e:
        logger.error(f'Failed to upload artifact: {e}')
        return None


async def upload_pdf(pdf_bytes: bytes, file_name: str) -> dict[str, Any]:
    """Upload PDF to S3 and return download info."""
    try:
        file_id = str(uuid.uuid4())
        key = f'pdfs/{file_id}/{file_name}'
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=pdf_bytes,
            ContentType='application/pdf',
        )
        url = f'{S3_ENDPOINT}/{S3_BUCKET}/{key}'
        return {
            'success': True,
            'file_id': file_id,
            'file_name': file_name,
            'file_size': len(pdf_bytes),
            'download_url': url,
            'content_type': 'application/pdf',
        }
    except Exception as e:
        logger.error(f'Failed to upload PDF: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to upload PDF: {str(e)}',
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager."""
    logger.info('MouseAI Code Interpreter starting...')
    try:
        r = await get_redis()
        await r.ping()
        logger.info('Redis connection established')
    except Exception as e:
        logger.warning(f'Redis connection failed: {e}')

    yield

    logger.info('Shutting down...')
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title='MouseAI Code Interpreter',
    description='Python code execution service with PDF generation support',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
async def health_check() -> JSONResponse:
    """Health check endpoint."""
    try:
        r = await get_redis()
        await r.ping()
        redis_status = 'connected'
    except Exception:
        redis_status = 'disconnected'

    return JSONResponse({
        'status': 'ok',
        'service': 'mouseai-code-interpreter',
        'version': '1.0.0',
        'redis': redis_status,
    })


@app.post('/execute', response_model=ExecutionResponse)
async def execute_code(req: ExecutionRequest) -> ExecutionResponse:
    """Execute code and return results."""
    # Validate code
    valid, error_msg = validate_code(req.code)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Generate session ID if not provided
    session_id = req.session_id or str(uuid.uuid4())

    # Execute code
    if req.language == 'python':
        stdout, stderr, execution_time = await execute_python(
            req.code,
            req.timeout,
            session_id,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Unsupported language: {req.language}',
        )

    success = stderr == '' or not any(
        keyword in stderr.lower()
        for keyword in ('error', 'exception', 'traceback', 'failed')
    )

    return ExecutionResponse(
        session_id=session_id,
        success=success,
        stdout=stdout[:MAX_OUTPUT_SIZE],
        stderr=stderr[:MAX_OUTPUT_SIZE],
        execution_time=execution_time,
        artifacts=[],
    )


@app.post('/execute-stream')
async def execute_stream(req: Request) -> JSONResponse:
    """Streaming execution endpoint (returns SSE-like JSON chunks)."""
    body = await req.json()
    code = body.get('code', '')
    session_id = body.get('session_id', str(uuid.uuid4()))

    valid, error_msg = validate_code(code)
    if not valid:
        return JSONResponse({'error': error_msg})

    stdout, stderr, execution_time = await execute_python(code, 60, session_id)

    return JSONResponse({
        'session_id': session_id,
        'chunks': [
            {'type': 'stdout', 'data': stdout},
            {'type': 'stderr', 'data': stderr},
        ],
        'execution_time': execution_time,
    })


@app.post('/generate-pdf', response_model=PDFGenerationResponse)
async def generate_pdf_endpoint(req: PDFGenerationRequest) -> PDFGenerationResponse:
    """
    Generate PDF from HTML or Markdown content using WeasyPrint.

    Supports editorial typography with:
    - EB Garamond, Cormorant Garamond, Cinzel fonts
    - A4 page size with configurable margins
    - Automatic styling for headings, tables, code blocks
    """
    logger.info(f'Generating PDF: title={req.title}, font={req.font_family}')

    try:
        pdf_bytes, file_name = await generate_pdf(
            content=req.content,
            title=req.title,
            font_family=req.font_family,
            font_size=req.font_size,
            page_size=req.page_size,
            margin_top=req.margin_top,
            margin_bottom=req.margin_bottom,
            margin_left=req.margin_left,
            margin_right=req.margin_right,
            content_format=req.format,
        )

        result = await upload_pdf(pdf_bytes, file_name)
        return PDFGenerationResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'PDF generation failed: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'PDF generation failed: {str(e)}',
        )


@app.post('/generate-pdf-file')
async def generate_pdf_file(req: PDFGenerationRequest) -> JSONResponse:
    """
    Generate PDF and return as base64 encoded data (for small files).
    Falls back to S3 upload for large files.
    """
    logger.info(f'Generating PDF (inline): title={req.title}')

    try:
        pdf_bytes, file_name = await generate_pdf(
            content=req.content,
            title=req.title,
            font_family=req.font_family,
            font_size=req.font_size,
            page_size=req.page_size,
            margin_top=req.margin_top,
            margin_bottom=req.margin_bottom,
            margin_left=req.margin_left,
            margin_right=req.margin_right,
            content_format=req.format,
        )

        # If PDF is smaller than 5MB, return as base64
        if len(pdf_bytes) < 5 * 1024 * 1024:
            import base64
            b64 = base64.b64encode(pdf_bytes).decode('utf-8')
            return JSONResponse({
                'success': True,
                'file_name': file_name,
                'file_size': len(pdf_bytes),
                'data': b64,
                'content_type': 'application/pdf',
                'encoding': 'base64',
            })

        # For larger files, upload to S3
        result = await upload_pdf(pdf_bytes, file_name)
        return JSONResponse(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'PDF generation failed: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'PDF generation failed: {str(e)}',
        )


@app.get('/fonts')
async def list_fonts() -> JSONResponse:
    """List available fonts in the environment."""
    fonts = {
        'system': [
            'EB Garamond',
            'Cormorant Garamond',
            'Cinzel',
            'Liberation Serif',
            'DejaVu Serif',
            'Georgia',
            'Times New Roman',
        ],
        'weasyprint_available': WEASYPRINT_AVAILABLE,
    }
    return JSONResponse(fonts)


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', '8080'))
    uvicorn.run(app, host='0.0.0.0', port=port)
