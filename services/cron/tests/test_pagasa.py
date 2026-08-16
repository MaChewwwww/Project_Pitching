from datetime import UTC, datetime

from integrations.pagasa import PagasaSource, _pagasa_query_time


def test_pagasa_query_time_uses_latest_complete_ten_minute_slot() -> None:
    now = datetime(2026, 8, 16, 22, 36, tzinfo=UTC)

    assert _pagasa_query_time(now) == "202608170620"


def test_get_stations_sends_observation_slot(monkeypatch) -> None:
    captured = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            pass

        def json(self) -> list[dict]:
            return []

    class FakeClient:
        def __init__(self, **kwargs) -> None:
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args) -> None:
            pass

        def get(self, url, **kwargs):
            captured.update(url=url, **kwargs)
            return FakeResponse()

    monkeypatch.setattr("integrations.pagasa.httpx.Client", FakeClient)
    monkeypatch.setattr("integrations.pagasa._pagasa_query_time", lambda: "202608170620")

    PagasaSource(station="Montalban")._get_stations()

    assert captured["params"] == {"ymdhm": "202608170620"}


def test_fetch_parses_marked_level_and_preserves_observation_time(monkeypatch) -> None:
    source = PagasaSource(station="Montalban")
    monkeypatch.setattr(
        source,
        "_get_stations",
        lambda: [
            {
                "obsnm": "Montalban",
                "wl": "22.68(*)",
                "ymdhm": "202608170620",
            }
        ],
    )

    readings = source.fetch()

    assert len(readings) == 1
    assert readings[0].value == 22.68
    assert readings[0].observed_at == datetime(2026, 8, 16, 22, 20, tzinfo=UTC)


def test_fetch_treats_null_level_as_idle(monkeypatch) -> None:
    source = PagasaSource(station="Montalban")
    monkeypatch.setattr(
        source,
        "_get_stations",
        lambda: [{"obsnm": "Montalban", "wl": None, "ymdhm": None}],
    )

    assert source.fetch() == []
