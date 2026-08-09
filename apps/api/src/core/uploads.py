"""Upload validation and storage (NFR-SEC-008).

Files are validated by sniffing magic bytes — never trusted by
`Content-Type` or filename, both client-supplied and trivially spoofed —
and streamed to disk in fixed-size chunks so a declared-small file cannot
exhaust memory before its real size is known. Filenames are generated from
`uuid4()`; the client's filename is discarded entirely, so there is no path
traversal and no `evil.php.jpg` naming trick to defend against.

Storage itself needs nothing new here: `settings.upload_dir` is a Docker
volume mounted read-only into Caddy (`infra/caddy/Caddyfile`), which serves
`/uploads/*` directly with `X-Content-Type-Options: nosniff` — files never
pass back through this process to be served, only to be written.

**Residual risk, flagged rather than silently accepted: EXIF is preserved.**
A phone photo carries GPS coordinates, and the only thing standing between
a stored file and anyone with its URL is an unguessable UUID — security by
obscurity. Acceptable for the demo; stripping EXIF needs Pillow (a new
dependency) and belongs in `tech_stack.md` before any real deployment. See
the open item in `frs_nfrs.md` Section 17.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile, status

from src.core.config import settings
from src.core.errors import AppError

CHUNK_SIZE = 64 * 1024  # 64 KB — small enough that a hostile client streaming
# forever is bounded by the size check on each chunk, not by memory growth.

# Signature bytes, not extensions or Content-Type. A `.php` renamed `.jpg`
# has none of these at its start and is rejected regardless of what its name
# or header claims.
_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"


class UploadRejectedError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_type = "upload-rejected"
    title = "File could not be accepted"


def _sniff_extension(header: bytes) -> str | None:
    if header.startswith(_JPEG):
        return ".jpg"
    if header.startswith(_PNG):
        return ".png"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return ".webp"
    return None


async def save_upload(file: UploadFile, *, subdir: str) -> str:
    """Validate and stream `file` to disk. Returns a path relative to
    `settings.upload_dir`, e.g. `"incident-reports/2026/08/<uuid>.jpg"` —
    never the client's filename, which this function never even reads.
    """
    max_bytes = settings.max_upload_mb * 1024 * 1024

    header = await file.read(64)
    ext = _sniff_extension(header)
    if ext is None:
        raise UploadRejectedError("Only JPEG, PNG, or WEBP images are accepted.")

    now = datetime.now(UTC)
    relative_dir = Path(subdir) / f"{now:%Y}" / f"{now:%m}"
    name = f"{uuid.uuid4().hex}{ext}"
    relative_path = relative_dir / name

    absolute_dir = Path(settings.upload_dir) / relative_dir
    absolute_dir.mkdir(parents=True, exist_ok=True)
    absolute_path = absolute_dir / name

    total = len(header)
    try:
        with open(absolute_path, "wb") as out:
            out.write(header)
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise UploadRejectedError(
                        f"File exceeds the {settings.max_upload_mb} MB limit."
                    )
                out.write(chunk)
    except UploadRejectedError:
        absolute_path.unlink(missing_ok=True)
        raise

    # Forward slashes always — this becomes a URL path segment
    # (`IncidentReportOut.photo_url`), not a filesystem path, on the way out.
    return str(relative_path).replace("\\", "/")
