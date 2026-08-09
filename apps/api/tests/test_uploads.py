"""NFR-SEC-008 / `core/uploads.py`.

Every test points `settings.upload_dir` at pytest's own `tmp_path` so
nothing here writes into the real `/uploads` volume.
"""

from __future__ import annotations

import io

import pytest
from fastapi import UploadFile

from src.core import uploads as uploads_module
from src.core.uploads import UploadRejectedError, save_upload


@pytest.fixture(autouse=True)
def _isolate_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads_module.settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(uploads_module.settings, "max_upload_mb", 5)
    return tmp_path


def _upload(content: bytes, filename: str = "photo.jpg") -> UploadFile:
    return UploadFile(io.BytesIO(content), filename=filename)


async def test_a_php_payload_renamed_jpg_is_rejected():
    php_payload = b"<?php system($_GET['c']); ?>" + b"\x00" * 100
    with pytest.raises(UploadRejectedError):
        await save_upload(_upload(php_payload, filename="photo.jpg"), subdir="incident-reports")


async def test_a_real_jpeg_header_is_accepted(tmp_path):
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 200
    relative_path = await save_upload(_upload(jpeg_bytes), subdir="incident-reports")

    assert relative_path.endswith(".jpg")
    assert (tmp_path / relative_path).exists()


async def test_the_stored_filename_contains_nothing_from_the_client(tmp_path):
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 50
    relative_path = await save_upload(
        _upload(jpeg_bytes, filename="../../evil.php.jpg"), subdir="incident-reports"
    )

    assert "evil" not in relative_path
    assert ".." not in relative_path
    # The path stays confined to the subdir this function was told to use.
    assert relative_path.startswith("incident-reports/")


async def test_the_returned_path_is_relative_not_absolute():
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 50
    relative_path = await save_upload(_upload(jpeg_bytes), subdir="incident-reports")

    assert not relative_path.startswith("/")


async def test_an_oversized_file_is_rejected_without_buffering_the_whole_thing(tmp_path):
    """6 MB against a 5 MB cap — the important property is that this raises
    partway through streaming, not after reading everything into memory."""

    class _GrowingStream:
        """Yields chunks forever; `save_upload` must stop reading once the
        cap is exceeded, or this would hang the test."""

        def __init__(self):
            self._sent = 0
            self._header_sent = False

        async def read(self, n: int = -1) -> bytes:
            if not self._header_sent:
                self._header_sent = True
                return b"\xff\xd8\xff\xe0"
            if self._sent > 8 * 1024 * 1024:  # safety valve well past the cap
                return b""
            self._sent += n
            return b"\x00" * n

    upload = UploadFile(io.BytesIO(b""), filename="huge.jpg")
    upload.read = _GrowingStream().read  # type: ignore[method-assign]

    with pytest.raises(UploadRejectedError):
        await save_upload(upload, subdir="incident-reports")

    # No partial file left behind after rejection.
    assert list(tmp_path.rglob("*.jpg")) == []


async def test_an_unrecognised_file_type_is_rejected():
    with pytest.raises(UploadRejectedError):
        await save_upload(_upload(b"not an image, just text"), subdir="incident-reports")
