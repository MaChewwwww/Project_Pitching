"""Unit tests for the constrained article JSON contract (NFR-SEC-013)."""

from __future__ import annotations

import pytest

from src.domain.article_document import (
    InvalidArticleDocument,
    document_plain_text,
    plain_text_document,
    slug_base,
    validate_article_document,
)


def test_accepts_the_editor_document_subset() -> None:
    document = {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "Ready"}],
            },
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "Read the guide",
                        "marks": [{"type": "link", "attrs": {"href": "https://example.gov.ph"}}],
                    }
                ],
            },
        ],
    }

    assert validate_article_document(document) == document


@pytest.mark.parametrize(
    "document",
    [
        {"type": "doc", "content": [{"type": "image", "attrs": {}}]},
        {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1}}]},
        {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Unsafe",
                            "marks": [{"type": "link", "attrs": {"href": "javascript:alert(1)"}}],
                        }
                    ],
                }
            ],
        },
    ],
)
def test_rejects_nodes_and_links_outside_the_allow_list(document: dict[str, object]) -> None:
    with pytest.raises(InvalidArticleDocument):
        validate_article_document(document)


def test_plain_text_helpers_preserve_safe_text_and_slug() -> None:
    document = plain_text_document("  Barangay readiness  ")

    assert document_plain_text(document) == "Barangay readiness"
    assert slug_base("Barangay San Jos\u00e9: Readiness!") == "barangay-san-jose-readiness"
