"""Regression coverage for activity and preparedness content workflows."""

from __future__ import annotations


async def test_public_activities_filter_by_type_and_reject_invalid_values(client):
    response = await client.get("/api/v1/public/activities", params={"type": "first_aid"})
    assert response.status_code == 200
    assert all(item["type"] == "first_aid" for item in response.json()["items"])

    invalid = await client.get("/api/v1/public/activities", params={"type": "not-a-type"})
    assert invalid.status_code == 422


async def test_admin_can_delete_an_activity_and_its_public_slug_disappears(admin_client):
    listing = await admin_client.get("/api/v1/admin/activities")
    assert listing.status_code == 200
    activity = listing.json()[0]

    deleted = await admin_client.delete(f"/api/v1/admin/activities/{activity['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"ok": True}

    after = await admin_client.get("/api/v1/admin/activities")
    assert activity["id"] not in {item["id"] for item in after.json()}

    public = await admin_client.get(f"/api/v1/public/activities/{activity['slug']}")
    assert public.status_code == 404


async def test_published_article_creation_requires_media_before_publication(admin_client):
    article = await admin_client.post(
        "/api/v1/admin/announcements",
        json={
            "kind": "announcement",
            "type": "general",
            "title": "Cover required announcement",
            "excerpt": "This should remain unpublished without media.",
            "body_json": {"type": "doc", "content": []},
            "is_barangay_wide": True,
            "publication_status": "published",
        },
    )
    assert article.status_code == 409

    drive = await admin_client.post(
        "/api/v1/admin/donation-drives",
        json={
            "title": "Cover required donation drive",
            "excerpt": "This should remain unpublished without media.",
            "body_json": {"type": "doc", "content": []},
            "organizer_name": "Barangay San Jose Relief Desk",
            "organizer_contact": "(02) 8555-0100",
            "publication_status": "published",
        },
    )
    assert drive.status_code == 409


async def test_admin_guides_expose_real_publication_state_and_review_date(admin_client):
    listing = await admin_client.get("/api/v1/admin/guides")
    assert listing.status_code == 200
    guide = listing.json()[0]
    assert "is_published" in guide
    assert "last_reviewed_at" in guide

    detail = await admin_client.get(f"/api/v1/admin/guides/{guide['id']}")
    assert detail.status_code == 200
    assert detail.json()["is_published"] == guide["is_published"]


async def test_draft_guide_may_omit_review_record_but_published_guide_cannot(admin_client):
    payload = {
        "slug": "draft-guide-for-test",
        "hazard_type": "flood",
        "phase": "before",
        "title_fil": "Pansamantalang gabay",
        "title_en": "Temporary guide",
        "body_fil": "Pansamantalang nilalaman.",
        "body_en": "Temporary content.",
        "source_attribution": None,
        "last_reviewed_at": None,
        "is_published": False,
        "sort_order": 99,
    }
    created = await admin_client.post("/api/v1/admin/guides", json=payload)
    assert created.status_code == 200
    assert created.json()["is_published"] is False

    payload["is_published"] = True
    blocked = await admin_client.post("/api/v1/admin/guides", json=payload)
    assert blocked.status_code == 422
