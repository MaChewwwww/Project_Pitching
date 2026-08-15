"""Regression coverage for map-backed operational registries.

These keep the admin DTOs honest: the console map needs lifecycle and geometry
fields that the public directory intentionally omits.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_facility_admin_list_includes_lifecycle_fields(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/api/v1/admin/facilities")
    assert response.status_code == 200
    for item in response.json():
        assert "is_active" in item
        assert "area_name" in item
        assert item["location"]["type"] == "Point"


@pytest.mark.asyncio
async def test_evacuation_admin_list_is_a_raw_map_ready_array(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/api/v1/admin/evacuation-centers")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    for item in response.json():
        assert "contact_person" in item
        assert "is_active" in item
        assert item["facility"]["location"]["type"] == "Point"


@pytest.mark.asyncio
async def test_resident_cannot_open_operational_registry(head_client: AsyncClient) -> None:
    response = await head_client.get("/api/v1/admin/sirens")
    assert response.status_code == 403
