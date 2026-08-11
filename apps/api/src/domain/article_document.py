"""Pure validation helpers for persisted article documents (NFR-SEC-013).

The API stores a deliberately small Tiptap-compatible JSON subset.  Keeping
this validation free of framework and ORM imports makes the allowed document
shape easy to test and keeps raw HTML out of the database.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any
from urllib.parse import urlparse


class InvalidArticleDocument(ValueError):
    """Raised when a proposed article document is outside the approved subset."""


_BLOCK_TYPES = {"paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote"}
_MARK_TYPES = {"bold", "italic", "link"}


def _validate_marks(marks: Any) -> None:
    if marks is None:
        return
    if not isinstance(marks, list):
        raise InvalidArticleDocument("Text marks must be a list.")
    for mark in marks:
        if not isinstance(mark, dict) or mark.get("type") not in _MARK_TYPES:
            raise InvalidArticleDocument("This text formatting is not allowed.")
        if mark["type"] == "link":
            href = (mark.get("attrs") or {}).get("href")
            if not isinstance(href, str) or urlparse(href).scheme not in {"http", "https"}:
                raise InvalidArticleDocument("Links must use http or https.")


def _validate_node(node: Any) -> None:
    if not isinstance(node, dict):
        raise InvalidArticleDocument("Article nodes must be objects.")
    node_type = node.get("type")
    if node_type == "text":
        if not isinstance(node.get("text"), str):
            raise InvalidArticleDocument("Text nodes must contain text.")
        _validate_marks(node.get("marks"))
        return
    if node_type not in _BLOCK_TYPES:
        raise InvalidArticleDocument("This article content is not allowed.")
    if node_type == "heading":
        level = (node.get("attrs") or {}).get("level")
        if level not in {2, 3}:
            raise InvalidArticleDocument("Only H2 and H3 headings are allowed.")
    content = node.get("content", [])
    if not isinstance(content, list):
        raise InvalidArticleDocument("Article content must be a list.")
    for child in content:
        _validate_node(child)


def validate_article_document(value: Any) -> dict[str, Any]:
    """Validate and return a JSON-safe Tiptap document object."""
    if not isinstance(value, dict) or value.get("type") != "doc":
        raise InvalidArticleDocument("Article body must be a Tiptap document.")
    content = value.get("content", [])
    if not isinstance(content, list):
        raise InvalidArticleDocument("Article document content must be a list.")
    for node in content:
        _validate_node(node)
    return value


def plain_text_document(value: str | None) -> dict[str, Any]:
    """Convert deployed plain text into a minimal valid article document."""
    text = (value or "").strip()
    paragraph: dict[str, Any] = {"type": "paragraph"}
    if text:
        paragraph["content"] = [{"type": "text", "text": text}]
    return {"type": "doc", "content": [paragraph]}


def slug_base(value: str) -> str:
    """Return the deterministic, readable base used for canonical article URLs."""
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "article"


def document_plain_text(value: dict[str, Any]) -> str:
    """Return a compact text fallback for alert banners and metadata previews."""
    parts: list[str] = []

    def visit(node: Any) -> None:
        if not isinstance(node, dict):
            return
        if node.get("type") == "text" and isinstance(node.get("text"), str):
            parts.append(node["text"])
        for child in node.get("content", []):
            visit(child)

    visit(value)
    return " ".join(" ".join(parts).split())
