"""PAGASA FFWS river-level adapter (FR-WX-008).

`GET /water/map_list.do` on the Pasig-Marikina-Tullahan FFWS site returns a plain
JSON array — confirmed live (tech_stack.md Section 7) — so this is a polite JSON
fetch, not an HTML scraper. No parser to break when the markup changes, because
there is no markup here; the risk that remains is the endpoint shape changing
without notice, which is why the field access below is defensive.

Isolated in this one file on purpose (architecture.md Section 8.1): if PAGASA ever
does change this response, `ManualSource` is the first-class fallback, not a patch
rushed into this file mid-storm.

Relative imports so this resolves identically from `apps/api` and from
`services/cron` — see `open_meteo.py`'s docstring for why.
"""

from __future__ import annotations

import ssl
from datetime import UTC, datetime, timedelta

import httpx

from .base import Reading, SourceHealth

FFWS_URL = "https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/map_list.do"

# PHT is UTC+8 year-round — no DST in the Philippines.
_PHT_OFFSET = timedelta(hours=8)

USER_AGENT = (
    "SAGIP-SJ/0.1 (barangay disaster readiness prototype; polite poll, see tech_stack.md Sec.7)"
)

# The FFWS server sends only its leaf certificate (`*.pagasa.dost.gov.ph`), never
# the intermediate that chains it to a trusted root — confirmed with
# `openssl s_client -showcerts`, verify code 21 "unable to verify the first
# certificate". Browsers paper over this by fetching the intermediate via the
# certificate's Authority Information Access (AIA) extension automatically;
# Python's `ssl` module does not. Without this, every fetch fails
# `CERTIFICATE_VERIFY_FAILED` — permanently, not intermittently — which would
# make "always fetch live" silently degrade to "always fall back to manual"
# (tech_stack.md Section 7 decision log).
#
# Rather than disabling verification (a real MITM exposure for a site reachable
# over the public internet — NFR-SEC-* territory even for a read-only fetch),
# the missing intermediate is bundled here so the chain verifies properly up to
# GlobalSign's root, which standard trust stores already carry.
#
#   AIA CA Issuers URI on the leaf cert:
#     http://secure.globalsign.com/cacert/gsgccr46ovtlsca2025.crt
#   Subject: C=BE, O=GlobalSign nv-sa, CN=GlobalSign GCC R46 OV TLS CA 2025
#   Valid until: 2029-06-23 — re-fetch from the AIA URL above if verification
#   ever starts failing again after that date, or if PAGASA rotates issuers.
_GLOBALSIGN_GCC_R46_OV_TLS_CA_2025 = """-----BEGIN CERTIFICATE-----
MIIFfDCCA2SgAwIBAgIRAIRDWJCDb2c5QYLLnJpdyZ8wDQYJKoZIhvcNAQELBQAw
RjELMAkGA1UEBhMCQkUxGTAXBgNVBAoTEEdsb2JhbFNpZ24gbnYtc2ExHDAaBgNV
BAMTE0dsb2JhbFNpZ24gUm9vdCBSNDYwHhcNMjUwOTE3MDI1NTU2WhcNMjkwNjIz
MDAwMDAwWjBUMQswCQYDVQQGEwJCRTEZMBcGA1UEChMQR2xvYmFsU2lnbiBudi1z
YTEqMCgGA1UEAxMhR2xvYmFsU2lnbiBHQ0MgUjQ2IE9WIFRMUyBDQSAyMDI1MIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1JyrGiv+210Lw4LTp9qxx9WC
o6w8HnxcTKr5XwR6WwtKidGXriLqGXtBINGTi4HUZ1Vl3FUIvscLwNcq2DRLwjWs
cYFNClVnuSw4CtwAcfa7Iltz+0FmFeh/KOWv5BfgCxAo9FaeXRG725b2eedo/7fb
0zBc6M/XcfQREVteZ6GovnLE96+T8RzRImvX38Y8vZoulp/XWv3p09C1pgp/53+1
itDl7xbrM4sglGNkeJ5LBN2dOR1sqWCMZ/V4a4cPQwopBtZis1vVh7/k4S6Ysgk0
CTi5vei0RSEIhxoFk48BHSXzTA4FJxqjfauYCZ4M5tmZ/R5VgXOZ4Ck/PifnXQID
AQABo4IBVTCCAVEwDgYDVR0PAQH/BAQDAgGGMBMGA1UdJQQMMAoGCCsGAQUFBwMB
MBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0OBBYEFGl0Pq/DWwGVSe4UQVqT+rEw
mNqiMB8GA1UdIwQYMBaAFANcq3OBh6jMsKbVlOI2lkn/BZksMHsGCCsGAQUFBwEB
BG8wbTAuBggrBgEFBQcwAYYiaHR0cDovL29jc3AuZ2xvYmFsc2lnbi5jb20vcm9v
dHI0NjA7BggrBgEFBQcwAoYvaHR0cDovL3NlY3VyZS5nbG9iYWxzaWduLmNvbS9j
YWNlcnQvcm9vdHI0Ni5jcnQwNgYDVR0fBC8wLTAroCmgJ4YlaHR0cDovL2NybC5n
bG9iYWxzaWduLmNvbS9yb290cjQ2LmNybDAhBgNVHSAEGjAYMAgGBmeBDAECAjAM
BgorBgEEAaAyCgECMA0GCSqGSIb3DQEBCwUAA4ICAQBEUTiKxe5jEintARUvLBm9
qWZtGiOSV9E+3bntbFFBDBAroqwB6Cj53Zp/W08HwgxaPXdkVaRNYHB/eAatEtSm
1ldtoorfPc+mVlzbwCwfbpIs2uqW5rF78ne37qy2o+iVnJptq9AzPnlC03+zhhB9
JwmjUXVtPuqQZ96tFl0fAT77xGSLzCO8yfEDrxCqdWz2wneShSbCCsC15JB07OgO
StE+MsVBkwe5+PNzAlAr8NZ6f8mzeY/FzaBzlhYw5+c1yyzXJqp+gjRXWrLpD3Ho
hGOvIXIvCBnyVrYI/HPe6DR5w7oteui9Rt0xfUUudaTkt0iz7fc23eGboZ+bpvgT
gbd/kYK6JOrxawMyfBYxrR5zDHIJX0Mws99DNgACKBUfFadKAfwFw0+0airY5WAI
Xs8yhCb5XGwyzVpcB30BrQbWtqdI0PoE9usNvNbH3YFGfuS8oRmAJEgUUQnwOoGK
jMWtHacw0n8QESdRM274LJvLd9nwawYU4svJpf06FtKPqGH3nXefL741NO9KzDAG
PM11YScyJVfYdBDXFM86HU1fBGTKlkLcG/qMJxOqppY4wydRI3koSH6A78nO2QaJ
yqjTOQyCNHaSlmGjdiOvhJ8y1PiazHnuvWBx6z+7JJF2ukqqfjlSARwyfkfnRUIY
la7ZYEqcc56eoPAiElhvrg==
-----END CERTIFICATE-----"""


def _ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context()
    context.load_verify_locations(cadata=_GLOBALSIGN_GCC_R46_OV_TLS_CA_2025)
    return context


def _parse_ymdhm(value: str | None) -> datetime | None:
    """`ymdhm` arrives as `YYYYMMDDHHmm` in Philippine Standard Time."""
    if not value or len(value) != 12:
        return None
    naive = datetime.strptime(value, "%Y%m%d%H%M")
    return (naive - _PHT_OFFSET).replace(tzinfo=UTC)  # PHT -> UTC storage (NFR-DAT-003)


class PagasaSource:
    """Implements `DataSource` (FR-WX-008)."""

    name = "pagasa"

    def __init__(self, *, station: str, timeout: float = 15.0) -> None:
        self.station = station
        self.timeout = timeout

    def _get_stations(self) -> list[dict]:
        with httpx.Client(
            timeout=self.timeout, headers={"User-Agent": USER_AGENT}, verify=_ssl_context()
        ) as client:
            response = client.get(FFWS_URL)
            response.raise_for_status()
            return response.json()

    def fetch(self) -> list[Reading]:
        """One `river_level` reading for the configured station, or **none**.

        A station with `wl: null` is idle, not broken — the gauge only reports a
        value during an actual event. That is a legitimate "nothing new" outcome,
        not a fetch failure, so this returns an empty list rather than raising.
        Genuine failures (network error, non-200, malformed JSON) propagate and
        are the caller's job to log and skip (architecture.md Section 8.2).
        """
        stations = self._get_stations()
        match = next((s for s in stations if s.get("obsnm") == self.station), None)
        if match is None:
            raise ValueError(f"Station '{self.station}' not found in FFWS response.")

        wl = match.get("wl")
        if wl is None:
            return []

        observed_at = _parse_ymdhm(match.get("ymdhm")) or datetime.now(UTC)
        return [
            Reading(
                source=self.name,
                metric="river_level",
                value=float(wl),
                unit="m",
                observed_at=observed_at,
                station=self.station,
                raw=match,
            )
        ]

    def health(self) -> SourceHealth:
        try:
            self._get_stations()
            return SourceHealth(
                name=self.name, is_reachable=True, last_success_at=datetime.now(UTC)
            )
        except Exception as exc:  # noqa: BLE001 — health reports, never raises
            return SourceHealth(name=self.name, is_reachable=False, detail=str(exc))
