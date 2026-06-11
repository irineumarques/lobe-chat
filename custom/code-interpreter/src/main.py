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


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', '8080'))
    uvicorn.run(app, host='0.0.0.0', port=port)
