"""Seed data loader — `make seed`.

Reference data is loaded by migration, not at runtime (NFR-DAT-007); this module
handles the *demo* dataset instead: synthetic content and households, everything
marked or clearly identifiable as such (NFR-DAT-006, NFR-PRV-007).

It provides the curated demo content shown by the public site.

**Idempotent by default.** Each section checks whether its table already has rows
and skips if so, so normal application startup is harmless. The explicit
`--replace-public-content` option refreshes only public articles by deleting
activities, announcements, donation notices, and their media before inserting
this curated set. It is throwaway demo content, not schema.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path
from shutil import copyfile

from sqlalchemy import delete, func, select, update

from src.core.config import settings
from src.core.logging import configure_logging
from src.core.security import hash_password

# Importing the registry (not just the individual modules used below) puts every
# model into `Base.metadata` before any flush. Skipping this is exactly the trap
# `db/models_registry.py` warns about: `household.psgc_barangay_code` FKs to
# `psgc`, and if `config.models` (which owns `Psgc`) never got imported, SQLAlchemy
# cannot resolve that string-based ForeignKey at flush time.
from src.db.models_registry import Base  # noqa: F401
from src.db.session import SessionLocal, engine
from src.domain.article_document import plain_text_document, slug_base
from src.modules.activities.models import Activity, ActivityImage
from src.modules.alerts.models import Announcement, AnnouncementImage
from src.modules.donations.models import DonationDrive, DonationDriveImage
from src.modules.evacuation.models import EmergencyEvent, EvacCenter
from src.modules.geo.models import Area, Facility, Hotline
from src.modules.preparedness.models import Faq, Guide
from src.modules.registry.models import Household, Member
from src.modules.registry.reference import format_household_number
from src.modules.safety.models import IncidentReport, RescueRequest, UnregisteredPerson
from src.modules.users.models import User, UserArea
from src.modules.weather.models import FloodEvent, FloodEventArea, Forecast, Reading

log = logging.getLogger("api.seed")

DEMO_PASSWORD = "Sagip-SJ-Demo-2026!"


def _now() -> datetime:
    return datetime.now(UTC)


async def _table_has_rows(session, model) -> bool:
    count = (await session.execute(select(func.count()).select_from(model))).scalar_one()
    return count > 0


# --- areas (fixtures/areas.ts) -------------------------------------------------

AREA_DEFS = [
    ("Area 1", "A1", "high"),
    ("Area 2", "A2", "high"),
    ("Area 3", "A3", "medium"),
    ("Area 4", "A4", "medium"),
    ("Area 5", "A5", "low"),
    ("Area 6", "A6", "low"),
]


async def seed_areas(session) -> dict[str, Area]:
    if await _table_has_rows(session, Area):
        rows = (await session.execute(select(Area))).scalars().all()
        return {a.name: a for a in rows}

    from src.seed_data.area_boundaries import AREA_BOUNDARIES

    bounds_map = {name: (src, wkt) for name, code, src, wkt in AREA_BOUNDARIES}

    areas = {}
    for name, code, exposure in AREA_DEFS:
        src, wkt = bounds_map.get(name, ("approximate", None))
        area = Area(
            name=name,
            code=code,
            flood_exposure=exposure,
            boundary_source=src if wkt else None,
            geom=func.ST_GeomFromText(wkt, 4326) if wkt else None,
            centroid=func.ST_PointOnSurface(func.ST_GeomFromText(wkt, 4326)) if wkt else None,
        )
        session.add(area)
        areas[name] = area
    await session.flush()
    log.info("seeded areas", extra={"count": len(areas)})
    return areas


# --- users -----------------------------------------------------------------------
# Two kinds: (1) demo login accounts, one per role, for testing the console and
# role guards; (2) "officer" identities the seeded announcements are attributed
# to, matching fixtures/announcements.ts `issued_by_name` verbatim so
# FR-ALT-007 attribution reads the same as the fixture did.

DEMO_LOGINS = [
    # `.local`/`.test` look like the obvious choice for synthetic accounts, but
    # pydantic's `EmailStr` (email-validator) rejects both as reserved
    # special-use TLDs (RFC 2606) — a login attempt 422s before it ever reaches
    # the password check. Seeding straight into the DB skips that validation,
    # so this only surfaces when someone actually tries to sign in. Using the
    # same real, deliverable-shaped domain as the officer identities below
    # (distinguished by the `-demo` local-part) avoids the trap.
    ("superadmin-demo@sanjose.gov.ph", "Superadmin Demo", "superadmin"),
    ("admin-demo@sanjose.gov.ph", "Admin Demo", "admin"),
    ("bhw-demo@sanjose.gov.ph", "BHW Demo", "bhw"),
    ("sk-demo@sanjose.gov.ph", "SK Officer Demo", "sk"),
    ("head-demo@sanjose.gov.ph", "Household Head Demo", "head"),
]

OFFICER_IDENTITIES = [
    ("bdrrmc@sanjose.gov.ph", "Barangay Disaster Risk Reduction and Management Committee", "admin"),
    ("captain@sanjose.gov.ph", "Office of the Barangay Captain", "admin"),
    ("safety@sanjose.gov.ph", "Barangay Public Safety Office", "admin"),
    ("health@sanjose.gov.ph", "Barangay Health Office", "admin"),
    ("sk-office@sanjose.gov.ph", "Sangguniang Kabataan", "sk"),
]


async def seed_users(session, areas: dict[str, Area]) -> dict[str, User]:
    if await _table_has_rows(session, User):
        rows = (await session.execute(select(User))).scalars().all()
        return {u.full_name: u for u in rows}

    password_hash = hash_password(DEMO_PASSWORD)
    users: dict[str, User] = {}

    for email, full_name, role in [*DEMO_LOGINS, *OFFICER_IDENTITIES]:
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=role,
            status="active",
        )
        session.add(user)
        users[full_name] = user
    await session.flush()

    # The demo BHW is scoped to Areas 1 and 2 — the riverside, highest-exposure
    # areas — so the role-scoping demo actually shows something restricted.
    bhw = users["BHW Demo"]
    for area_name in ("Area 1", "Area 2"):
        session.add(UserArea(user_id=bhw.id, area_id=areas[area_name].id))

    log.info("seeded users", extra={"count": len(users)})
    log.info(
        "demo login credentials",
        extra={"password": DEMO_PASSWORD, "accounts": ", ".join(e for e, _, _ in DEMO_LOGINS)},
    )
    return users


# --- hotlines (fixtures/hotlines.ts) -------------------------------------------

HOTLINE_DEFS = [
    # --- Primary, Emergency & Municipal Hotlines ---
    ("Barangay San Jose - Emergency Hotline", "0951-188-7878", "barangay", 1),
    ("National Emergency Hotline (911)", "911", "rescue", 2),
    (
        "Municipal Disaster Risk Reduction and Management Office (MDRRMO)",
        "0915-001-6988 / 0969-614-4825",
        "mdrrmo",
        3,
    ),
    ("PNP Rodriguez Municipal Police Station", "0999 195 5988", "police", 4),
    ("Rodriguez Fire Station (BFP)", "0951 604 7279", "fire", 5),
    ("Montalban Infirmary", "0917 129 3515", "hospital", 6),
    (
        "Rizal Provincial Hospital System (RPHS) — Casimiro A. Ynares Sr. Memorial Hospital",
        "(02) 8256-3000 / 0920 432 7079",
        "hospital",
        7,
    ),
    # --- Barangay Health Emergency Response Team (BHERT 2024) ---
    ("BHERT Command Center", "0951-188-7878", "barangay", 10),
    ("BHERT Area 01", "0963-1644357", "barangay", 11),
    ("BHERT Area 02", "0963-1644358", "barangay", 12),
    ("BHERT Area 03", "0963-1644359", "barangay", 13),
    ("BHERT Area 04 & 05", "0938-4552877", "barangay", 14),
    ("BHERT Area 06", "0963-1644355", "barangay", 15),
    # --- San Jose Proper & Relocation Area Hotlines ---
    ("Area 01 (San Jose Proper)", "0981-3310283", "barangay", 20),
    (
        "Area 1A (Litex Village/Abatex, Christine Ville Creek/Med Heights)",
        "0951-2101957",
        "barangay",
        21,
    ),
    (
        "Area 02 (VRV/Amityville/Christine Ville, Pamahay/Villa Ana/Zuniga Farm)",
        "0930-6367957",
        "barangay",
        22,
    ),
    ("Area 03 (Relocation)", "0981-3310286", "barangay", 23),
    ("Area 04 (Kasiglahan Phase 1-D/Phase 1-M)", "0951-2100870", "barangay", 24),
    (
        "Area 05 (Kasiglahan Phase 1-K/Phase 1-KT, Phase 1-Z/Phase 1-E/Phase 1-C)",
        "0930-4577488",
        "barangay",
        25,
    ),
    ("Area 06 (Sub-Urban/Metro Manila Hills)", "0963-4605277", "barangay", 26),
]


async def seed_hotlines(session) -> None:
    # Always refresh hotlines with the canonical official directory
    await session.execute(delete(Hotline))
    for label, number, type_, sort_order in HOTLINE_DEFS:
        session.add(Hotline(label=label, number=number, type=type_, sort_order=sort_order))
    await session.flush()
    log.info("seeded hotlines", extra={"count": len(HOTLINE_DEFS)})


# --- facilities (fixtures/facilities.ts) ---------------------------------------

FACILITY_DEFS = [
    (
        "Barangay San Jose Hall",
        "barangay_hall",
        "Purok 1, Barangay San Jose",
        "(02) 8555-0100",
        121.1351,
        14.7352,
        "Area 1",
    ),
    # The 14 real evacuation centres. Coordinates are from OpenStreetMap
    # (Nominatim + Overpass), reverse-geocode-confirmed to Montalban, Rizal;
    # `area_name` was computed by point-in-polygon against the boundaries in
    # `seed_data/area_boundaries.py`, not guessed — all 14 land inside a polygon.
    #
    # Every one is officially in Barangay San Jose: Kasiglahan Village, Rodriguez
    # Heights and Tagumpay are resettlement sites and subdivisions, *not*
    # barangays (Rodriguez has 11, listed in PhilAtlas). OSM tags KV variously as
    # San Isidro or San Rafael and is wrong; the addresses below follow DepEd.
    #
    # `contact` is None throughout: no published number was found for any of
    # them, and a placeholder would be a fake number on a public page people
    # might dial in an emergency.
    (
        "San Jose Elementary School",
        "evacuation_center",
        "Barangay San Jose, Rodriguez, Rizal",
        None,
        121.134770,
        14.730057,
        "Area 4",
    ),
    (
        "San Jose Litex Senior High School",
        "evacuation_center",
        "Litex Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.130018,
        14.735593,
        "Area 1",
    ),
    (
        "Kasiglahan Elementary School (Main)",
        "evacuation_center",
        "Phase 1B, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.141590,
        14.748304,
        "Area 3",
    ),
    (
        "Kasiglahan Village National High School",
        "evacuation_center",
        "Phase 1B, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.141548,
        14.749463,
        "Area 3",
    ),
    (
        "Kasiglahan Village Senior High School",
        "evacuation_center",
        "Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.143777,
        14.744411,
        "Area 3",
    ),
    (
        "Colegio De Montalban",
        "evacuation_center",
        "Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.141636,
        14.750415,
        "Area 3",
    ),
    (
        "Phase 1B Covered Court KV1",
        "evacuation_center",
        "Phase 1B, Kasiglahan Village 1, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.137494,
        14.744080,
        "Area 3",
    ),
    (
        "Kasiglahan Elementary School (Unit 1)",
        "evacuation_center",
        "Phase 1A, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.140167,
        14.744495,
        "Area 3",
    ),
    (
        "Barangay Annex Phase 1A KV1",
        "evacuation_center",
        "Phase 1A, Kasiglahan Village 1, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.140840,
        14.744607,
        "Area 3",
    ),
    (
        "Rodriguez Heights Elementary School",
        "evacuation_center",
        "Rodriguez Heights, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.123567,
        14.746546,
        "Area 2",
    ),
    (
        "Phase 1k1 Covered Court",
        "evacuation_center",
        "Phase 1K-1, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.144138,
        14.743326,
        "Area 3",
    ),
    (
        "Phase 1k2 Covered Court",
        "evacuation_center",
        "Phase 1K-2, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.145849,
        14.740192,
        "Area 3",
    ),
    (
        "Munting Ilaw, Kasiglahan Village",
        "evacuation_center",
        "Munting Ilaw, Phase 1D, Kasiglahan Village, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.138726,
        14.743006,
        "Area 3",
    ),
    (
        "Tagumpay National High School",
        "evacuation_center",
        "Pamayanan ng Tagumpay, Barangay San Jose, Rodriguez, Rizal",
        None,
        121.131258,
        14.745373,
        "Area 2",
    ),
    (
        "Barangay Health Center",
        "clinic",
        "Purok 1, Barangay San Jose",
        "(02) 8555-0120",
        121.1346,
        14.7357,
        "Area 1",
    ),
    (
        "Rodriguez District Hospital",
        "hospital",
        "Manggahan, Rodriguez, Rizal",
        "(02) 8555-0106",
        121.1287,
        14.7296,
        "Area 3",
    ),
    (
        "Police Community Precinct",
        "police",
        "Purok 3, Barangay San Jose",
        "(02) 8555-0103",
        121.1364,
        14.7381,
        "Area 3",
    ),
    (
        "Fire Sub-Station",
        "fire",
        "Purok 4, Barangay San Jose",
        "(02) 8555-0104",
        121.1331,
        14.7309,
        "Area 4",
    ),
    (
        "Barangay Rescue Station",
        "rescue_station",
        "Purok 2, Barangay San Jose",
        "0917-555-0101",
        121.1325,
        14.7365,
        "Area 2",
    ),
    (
        "Riverside Health Outpost",
        "clinic",
        "Purok 6, Barangay San Jose",
        None,
        121.1412,
        14.7288,
        "Area 6",
    ),
]


async def seed_facilities(session, areas: dict[str, Area]) -> dict[str, Facility]:
    if await _table_has_rows(session, Facility):
        rows = (await session.execute(select(Facility))).scalars().all()
        return {f.name: f for f in rows}

    facilities = {}
    for name, type_, address, contact, lon, lat, area_name in FACILITY_DEFS:
        facility = Facility(
            name=name,
            type=type_,
            address=address,
            contact_number=contact,
            area_id=areas[area_name].id,
            location=func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
        )
        session.add(facility)
        facilities[name] = facility
    await session.flush()
    log.info("seeded facilities", extra={"count": len(facilities)})
    return facilities


# --- evacuation centres (fixtures/evac-centers.ts) -----------------------------

# Capacity is an *estimate* scaled by facility size — no per-centre figure is
# published anywhere. The only real number is an aggregate: during Typhoon
# Ulysses (November 2020) 16 Rodriguez evacuation centres held 3,363 families /
# 15,591 individuals, described in local press as `siksikan` (overcrowded), which
# makes the ~7,600 below plausible as *normal* rather than surge capacity.
#
# Every `notes` string says the number is an estimate, and the five centres whose
# coordinates could not be pinned exactly say that too. These strings render on
# the public evacuation-centre cards, so an unqualified number would read as
# surveyed fact. Same honesty as `area.boundary_source = 'approximate'`.
EVAC_CENTER_DEFS = [
    (
        "Kasiglahan Village National High School",
        1200,
        True,
        "Largest of the Kasiglahan Village centres. Estimated capacity, pending "
        "MDRRMO confirmation.",
    ),
    (
        "Colegio De Montalban",
        1000,
        True,
        "Tertiary campus with multiple buildings. Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Tagumpay National High School",
        900,
        True,
        "Serves the Pamayanan ng Tagumpay side. Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Kasiglahan Elementary School (Main)",
        800,
        True,
        "Reportedly the largest enrolment in the Division of Rizal. Estimated "
        "capacity, pending MDRRMO confirmation.",
    ),
    (
        "Kasiglahan Village Senior High School",
        800,
        True,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "San Jose Litex Senior High School",
        700,
        True,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "San Jose Elementary School",
        500,
        True,
        "Ground floor reserved for seniors and persons with disabilities. "
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Kasiglahan Elementary School (Unit 1)",
        500,
        True,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Rodriguez Heights Elementary School",
        450,
        True,
        "Estimated capacity, pending MDRRMO confirmation.",
    ),
    (
        "Phase 1B Covered Court KV1",
        250,
        True,
        "Estimated capacity, pending MDRRMO confirmation. Pin is approximate — "
        "a second covered court in Phase 1B is also tagged as a shelter.",
    ),
    (
        "Munting Ilaw, Kasiglahan Village",
        200,
        True,
        "Has previously sheltered about 160 families. Estimated capacity, "
        "pending MDRRMO confirmation. Pin is at the Munting Ilaw health centre.",
    ),
    (
        "Phase 1k1 Covered Court",
        200,
        True,
        "Estimated capacity, pending MDRRMO confirmation. Pin is approximate.",
    ),
    (
        "Phase 1k2 Covered Court",
        200,
        True,
        "Estimated capacity, pending MDRRMO confirmation. Pin marks the Phase "
        "1K-2 area, not the building.",
    ),
    (
        "Barangay Annex Phase 1A KV1",
        100,
        True,
        "Smallest of the centres. Estimated capacity, pending MDRRMO "
        "confirmation. Pin marks the Phase 1A area, not the building.",
    ),
]


async def seed_evac_centers(session, facilities: dict[str, Facility]) -> None:
    if await _table_has_rows(session, EvacCenter):
        return
    for facility_name, capacity, is_open, notes in EVAC_CENTER_DEFS:
        facility = facilities[facility_name]
        session.add(
            EvacCenter(
                facility_id=facility.id,
                capacity=capacity,
                contact_person=None,
                contact_number=facility.contact_number,
                is_open=is_open,
                notes=notes,
            )
        )
    log.info("seeded evacuation centers", extra={"count": len(EVAC_CENTER_DEFS)})


# --- guides (fixtures/guides.ts, condensed) ------------------------------------

GUIDE_DEFS = [
    (
        "paghahanda-sa-baha",
        "flood",
        "before",
        "Paghahanda Bago Bumaha",
        "Preparing Before a Flood",
        "Ang baha sa San Jose ay kadalasang mabilis tumaas. Alamin kung ang inyong bahay ay nasa "
        "lugar na madalas bahain, ihanda ang Go Bag, at huwag hintaying umabot sa pintuan ang "
        "tubig"
        "bago lumikas. Huwag tumawid sa umaagos na tubig-baha.",
        "Flooding in San Jose tends to rise quickly. Find out whether your home sits in an "
        "area that floods often, pack a Go Bag, and do not wait for water to reach your door "
        "before leaving. Never cross moving floodwater.",
        "Adapted from NDRRMC and Philippine Red Cross public guidance",
        12,
        1,
    ),
    (
        "kaligtasan-sa-lindol",
        "earthquake",
        "during",
        "Kaligtasan Tuwing Lindol",
        "Earthquake Safety",
        "Walang babala ang lindol. Duck, Cover, and Hold — lumuhod, magtago sa ilalim ng matibay "
        "na mesa, at kumapit hanggang tumigil ang pagyanig. Suriin ang bahay bago pumasok muli.",
        "Earthquakes give no warning. Duck, Cover, and Hold — drop to your knees, get under "
        "sturdy furniture, and hold on until the shaking stops. Inspect the house before going "
        "back inside.",
        "Adapted from PHIVOLCS and NDRRMC public guidance",
        18,
        2,
    ),
    (
        "kaligtasan-sa-sunog",
        "fire",
        "before",
        "Pag-iwas at Kaligtasan sa Sunog",
        "Fire Prevention and Safety",
        "Karamihan sa sunog sa bahay ay nagsisimula sa kusina o sa maling paggamit ng kuryente. "
        "Huwag mag-overload ng extension cord at huwag iwanang nakabukas ang kalan.",
        "Most house fires start in the kitchen or from misused electricity. Do not overload "
        "extension cords, and never leave a lit stove unattended.",
        "Adapted from Bureau of Fire Protection public guidance",
        25,
        3,
    ),
    (
        "paghahanda-sa-bagyo",
        "typhoon",
        "before",
        "Paghahanda sa Bagyo",
        "Typhoon Preparedness",
        "Hindi tulad ng lindol, may babala ang bagyo. Sundan ang mga anunsyo ng PAGASA at ng "
        "barangay, ayusin ang bubong at kanal, at mag-imbak ng tubig at pagkain para sa tatlong "
        "araw.",
        "Unlike an earthquake, a typhoon announces itself. Follow PAGASA and barangay advisories, "
        "repair the roof and clear the drains, and store three days of water and food.",
        "Adapted from PAGASA and NDRRMC public guidance",
        9,
        4,
    ),
    (
        "san-jose-go-bag",
        "food",
        "n/a",
        "San Jose Go Bag Essentials",
        "San Jose Go Bag Essentials",
        "Ang Go Bag ay ang bag na dadalhin mo kapag kailangan mong umalis sa loob ng limang "
        "minuto."
        "Tubig para sa tatlong araw, kopya ng mga dokumento sa selyadong plastik, at flashlight.",
        "A Go Bag is the bag you take when you have five minutes to leave. Three days of "
        "drinking water, photocopies of documents sealed in plastic, and a flashlight.",
        "Adapted from NDRRMC, DOH and National Nutrition Council public guidance",
        6,
        5,
    ),
]


async def seed_guides(session) -> None:
    if await _table_has_rows(session, Guide):
        return
    for (
        slug,
        hazard,
        phase,
        title_fil,
        title_en,
        body_fil,
        body_en,
        source,
        reviewed_days_ago,
        sort_order,
    ) in GUIDE_DEFS:
        session.add(
            Guide(
                slug=slug,
                hazard_type=hazard,
                phase=phase,
                title_fil=title_fil,
                title_en=title_en,
                body_fil=body_fil,
                body_en=body_en,
                source_attribution=source,
                last_reviewed_at=_now() - timedelta(days=reviewed_days_ago),
                sort_order=sort_order,
            )
        )
    log.info("seeded guides", extra={"count": len(GUIDE_DEFS)})


# --- faqs (fixtures/faqs.ts) ----------------------------------------------------

FAQ_DEFS = [
    # 1. Registration
    (
        "Paano ko mairehistro ang aking sambahayan?",
        "How do I register my household?",
        "Maaari kayong magparehistro sa pamamagitan ng paggawa ng account sa website at pagrehistro ng lahat ng miyembro ng inyong sambahayan. Maaari rin kayong pumunta sa Barangay Hall upang magparehistro. Ang online na pagpaparehistro ay maaari ding magamit sa website na ito.",
        "You can register by creating an account on the website and registering all your household members. You can also go to the Barangay Hall to get registered. Online registration may also be available through this website.",
        "Registration",
        1,
    ),
    (
        "Bakit kailangan kong magparehistro?",
        "Why should I register?",
        "Ang pagpaparehistro ay tumutulong sa barangay na matukoy ang mga residenteng maaaring mangailangan ng tulong sa panahon ng emergency at kalamidad. Nagbibigay din ito ng mahalagang impormasyon upang mas mapaganda ng barangay ang pagpaplano ng serbisyo, mapabuti ang kaligtasan, at mabilis na matugunan ang mga pangangailangan ng mga residente.",
        "Registration helps the barangay identify residents who may need help during emergencies and disasters. It also provides important information about the community, which helps the barangay plan better services, improve safety measures, and respond more effectively to the needs of residents.",
        "Registration",
        2,
    ),
    (
        "Anong impormasyon ang kailangan kong ibigay para magparehistro?",
        "What information do I need to register?",
        "Maaaring kailanganin mong ibigay ang iyong pangalan, tirahan o address, numero ng telepono, listahan ng mga miyembro ng pamilya, at iba pang pangunahing impormasyon ng sambahayan.",
        "You may need to provide your name, address, contact number, family members, and other basic household information.",
        "Registration",
        3,
    ),
    (
        "Paano kung may magbago sa impormasyon ng aking pamilya?",
        "What if my family information changes?",
        "I-update ang inyong impormasyon sa pamamagitan ng website o ipagbigay-alam sa Tanggapan ng Barangay upang manatiling tama at napapanahon ang inyong rekord ng sambahayan.",
        "Update your information through the website or inform the Barangay Office so your household record stays correct.",
        "Registration",
        4,
    ),
    # 2. Emergencies
    (
        "Saan ang pinakamalapit na evacuation center?",
        "Where is the nearest evacuation center?",
        "Tingnan ang Hazard Map o ang pahina ng Evacuation Centers upang mahanap ang pinakamalapit na evacuation center at ang direksyon papunta roon.",
        "Check the Hazard Map or Evacuation Centers page to find the nearest evacuation center and directions.",
        "Emergencies",
        5,
    ),
    (
        "Ano ang ibig sabihin ng Alert Levels 1, 2, at 3?",
        "What do Alert Levels 1, 2, and 3 mean?",
        "Ipinapaalam ng mga alert level kung gaano kaseryoso ang sitwasyon. Palaging basahin at sundin ang mga tagubilin na nakasaad sa opisyal na alerto ng barangay.",
        "Alert levels tell you how serious the situation is. Always read and follow the instructions included in the barangay alert.",
        "Emergencies",
        6,
    ),
    (
        "Paano ako mag-uulat ng insidente o hihingi ng tulong/rescue?",
        "How do I report an incident or ask for rescue?",
        "Gamitin ang Report an Incident upang ipadala ang lokasyon at detalye ng emergency. Maaari rin kayong direktang tumawag sa Barangay o Rescue Team sa pamamagitan ng mga numerong nakalista sa seksyon ng Hotlines.",
        "Use Report an Incident to send the location and details of the emergency. You can also contact the Barangay or Rescue Team directly through the hotlines listed in the Hotlines section.",
        "Emergencies",
        7,
    ),
    (
        "Paano kung may nangangailangan ng agarang tulong?",
        "What if someone needs immediate help?",
        "Tumawag agad sa emergency hotline. Huwag nang maghintay ng sagot sa online report kung mayroong nasa agarang panganib.",
        "Call the emergency hotline immediately. Do not wait for an online report to be answered if someone is in immediate danger.",
        "Emergencies",
        8,
    ),
    (
        "Paano ko malalaman kung kailangan na naming lumikas?",
        "How will I know if we need to evacuate?",
        "Maging alerto sa mga opisyal na anunsyo sa paglikas, emergency alerts, mensaheng SMS, at mga direktang tagubilin mula sa mga opisyal ng barangay.",
        "Stay alert for official evacuation announcements, emergency alerts, SMS messages, and instructions from barangay officials.",
        "Emergencies",
        9,
    ),
    # 3. Preparedness
    (
        "Ano ang dapat na laman ng aking Go Bag?",
        "What should be inside my Go Bag?",
        "Maghanda ng maiinom na tubig, pagkain, mga gamot, flashlight, ekstrang baterya, power bank, first aid kit, damit, hygiene kit, mahahalagang dokumento, at pito (whistle).",
        "Prepare water, food, medicines, flashlight, batteries, power bank, first aid supplies, clothes, hygiene items, important documents, and a whistle.",
        "Preparedness",
        10,
    ),
    (
        "Ano ang dapat gawin ng aking pamilya bago ang sakuna?",
        "What should my family do before a disaster?",
        "Ihanda ang inyong Go Bag, alamin ang pinakamalapit na evacuation center, i-save ang mga emergency number, at tiyaking alam ng bawat miyembro ng pamilya kung saan pupunta.",
        "Prepare your Go Bag, know your nearest evacuation center, save emergency numbers, and make sure everyone in your household knows where to go.",
        "Preparedness",
        11,
    ),
    (
        "Ano ang dapat kong dalhin kapag lilikas?",
        "What should I bring when evacuating?",
        "Dalhin ang inyong Go Bag, mga gamot, mahahalagang dokumento, inuming tubig, damit, at mga espesyal na gamit para sa mga bata, matatanda, PWDs, o iba pang kapamilya na nangangailangan ng karagdagang suporta.",
        "Bring your Go Bag, medicines, important documents, drinking water, clothes, and essential items for children, seniors, PWDs, or other family members who need additional support.",
        "Preparedness",
        12,
    ),
    # 4. Evacuation & Assistance
    (
        "Paano ko malalaman kung may bakanteng espasyo pa sa isang evacuation center?",
        "How do I know if an evacuation center has available space?",
        "Tingnan ang pahina ng Evacuation Centers para sa pinakabagong impormasyon tungkol sa kapasidad at dami ng mga taong naroroon.",
        "Check the Evacuation Centers page for the latest available information about capacity and occupancy.",
        "Evacuation & Assistance",
        13,
    ),
    (
        "Paano ko malalaman kung kailan ipapamahagi ang mga relief goods?",
        "How do I know when relief goods will be distributed?",
        "Tingnan ang Barangay Announcements o ang pahina ng Assistance para sa mga iskedyul at pinakabagong balita.",
        "Check Barangay Announcements or the Assistance page for schedules and updates.",
        "Evacuation & Assistance",
        14,
    ),
    (
        "Paano ko masusuri ang katayuan ng aking kahilingan sa tulong?",
        "How can I check my assistance request?",
        "Gamitin ang Assistance Tracker upang tingnan kung ang inyong kahilingan ay pending, approved, o na-claim na.",
        "Use the Assistance Tracker to check whether your request is pending, approved, or already claimed.",
        "Evacuation & Assistance",
        15,
    ),
    # 5. Community
    (
        "Saan ko makikita ang mga paparating na aktibidad ng barangay?",
        "Where can I see upcoming barangay activities?",
        "Tingnan ang Community Activities para sa mga disaster drill, seminar, first aid training, clean-up drive, at iba pang mga kaganapan.",
        "Check Community Activities for disaster drills, seminars, first aid training, clean-up drives, and other activities.",
        "Community",
        16,
    ),
    (
        "Paano ako makakapag-boluntaryo sa mga aktibidad o emergency ng barangay?",
        "How can I volunteer during barangay activities or emergencies?",
        "Magparehistro sa pamamagitan ng seksyon ng Volunteer o bumisita sa Tanggapan ng Barangay para sa impormasyon ukol sa mga bukas na pagkakataon sa pagboboluntaryo.",
        "Register through the Volunteer section or visit the Barangay Office for information on available volunteer activities.",
        "Community",
        17,
    ),
    # 6. Donations
    (
        "Paano ako makakapag-donate o makapagbibigay ng donasyon?",
        "How can I donate?",
        "Tingnan ang seksyon ng Donations o makipag-ugnayan sa Tanggapan ng Barangay upang malaman kung anong mga gamit o donasyon ang kasalukuyang kinakailangan at kung saan ito maaaring dalhin.",
        "Check the Donations section or contact the Barangay Office to know what items are currently needed and where they can be brought.",
        "Donations",
        18,
    ),
    # 7. Using the Website
    (
        "Kailangan ko ba ng account para magamit ang website?",
        "Do I need an account to use the website?",
        "Ang ilang impormasyon ay maaaring matingnan kahit walang account, ngunit ang ilang partikular na serbisyo at personalized na feature ay nangangailangan ng pag-log in.",
        "Some information can be viewed without an account, while certain services and personalized features require you to log in.",
        "Using the Website",
        19,
    ),
    (
        "Maaari ko bang gamitin ang website sa aking cellphone o smartphone?",
        "Can I use the website on my phone?",
        "Oo. Maaaring buksan at gamitin ang website gamit ang alinmang suportadong web browser sa smartphone, tablet, laptop, o computer.",
        "Yes. The website can be accessed using a supported web browser on a smartphone, tablet, laptop, or computer.",
        "Using the Website",
        20,
    ),
    (
        "Saan ko makikita ang mga emergency contact number?",
        "Where can I find emergency contact numbers?",
        "Buksan ang seksyon ng Emergency Contacts o Hotlines upang makita ang lahat ng magagamit na numero ng barangay at emergency hotline.",
        "Open the Emergency Contacts section to view the available barangay and emergency hotlines.",
        "Using the Website",
        21,
    ),
    (
        "Paano ako mag-uulat ng insidente gamit ang website?",
        "How do I report an incident through the website?",
        "Buksan ang Incident Reporting, punan ang mga kinakailangang detalye, at i-submit ang inyong ulat. Maaari rin kayong maglakip ng litrato at lokasyon kung mayroon.",
        "Open Incident Reporting, provide the requested details, and submit your report. You may also attach a photo and location when available.",
        "Using the Website",
        22,
    ),
    (
        "Maaari ko bang masubaybayan ang katayuan ng aking naiulat na insidente?",
        "Can I check the status of something I reported?",
        "Oo, kung available ang tracking. Mag-log in sa inyong account at tingnan ang status ng inyong isinumiteng ulat.",
        "Yes, when tracking is available. Log in to your account and check the status of your submitted report.",
        "Using the Website",
        23,
    ),
    # 8. Alerts & Notifications
    (
        "Paano ako makakatanggap ng mga alerto mula sa website?",
        "How do I receive alerts from the website?",
        "Tiyaking tama ang inyong impormasyon sa account at numero ng telepono, at nakabukas ang notifications kapag kinakailangan.",
        "Make sure your account information and contact number are correct and that notifications are enabled when required.",
        "Alerts & Notifications",
        24,
    ),
    (
        "Bakit hindi ako nakakatanggap ng SMS o mga abiso sa website?",
        "Why am I not receiving SMS or website notifications?",
        "Suriin kung tama ang inyong nakarehistrong contact number. Ang pagkaantala sa signal ng network, kawalan ng mobile service, o naka-disable na notifications ay maaari ding makaapekto sa pagtanggap.",
        "Check that your registered contact information is correct. Network delays, unavailable mobile service, or disabled notifications may also affect delivery.",
        "Alerts & Notifications",
        25,
    ),
    (
        "Maaari ba akong makatanggap ng paalala tungkol sa mga aktibidad ng barangay?",
        "Can I receive reminders about barangay activities?",
        "Oo. Ang mga rehistradong residente ay maaaring makatanggap ng mga paalala para sa mga nakatakdang aktibidad at anunsyo kapag aktibo ang feature na ito.",
        "Yes. Registered residents may receive reminders for scheduled activities and announcements when this feature is available.",
        "Alerts & Notifications",
        26,
    ),
    # 9. Profile & Privacy
    (
        "Makikita ba ng lahat ang impormasyon ng aking pamilya?",
        "Is my family's information visible to everyone?",
        "Hindi. Ang pribadong impormasyon ng sambahayan ay hindi ipinapakita sa publiko at awtorisadong kawani lamang ng barangay ang may access dito.",
        "No. Private household information is not intended to be publicly displayed and should only be accessible to authorized users.",
        "Profile & Privacy",
        27,
    ),
    (
        "Bakit hinihingi ng website ang aking lokasyon?",
        "Why does the website ask for my location?",
        "Ang impormasyon sa lokasyon ay ginagamit para sa mga feature ng website tulad ng household mapping para sa kaligtasan at mabilis na pagtugon sa incident reporting.",
        "Location information is used by certain website features, such as household mapping and incident reporting.",
        "Profile & Privacy",
        28,
    ),
    (
        "Maaari ko bang baguhin o iwasto ang impormasyon sa aking profile?",
        "Can I change or correct information in my profile?",
        "Oo. Maaari ninyong i-edit ang mga impormasyong pinahihintulutan ng website na baguhin. Para sa mga impormasyong hindi mabago nang direkta, makipag-ugnayan sa Tanggapan ng Barangay.",
        "Yes. You can edit information that the website allows you to update. For information that cannot be changed directly, contact the Barangay Office.",
        "Profile & Privacy",
        29,
    ),
    # 10. Website Help
    (
        "Ano ang dapat kong gawin kung hindi gumagana ang isang pahina o feature?",
        "What should I do if a page or feature is not working?",
        "I-refresh ang pahina at suriin ang inyong koneksyon sa internet. Kung magpatuloy ang problema, makipag-ugnayan sa Tanggapan ng Barangay o sa website administrator.",
        "Refresh the page and check your internet connection. If the problem continues, contact the Barangay Office or website administrator.",
        "Website Help",
        30,
    ),
    (
        "Ano ang dapat kong gawin kung may maling impormasyon sa website?",
        "What should I do if information on the website is incorrect?",
        "Ipagbigay-alam ang maling impormasyon sa Tanggapan ng Barangay upang masuri at maiwasto agad ito.",
        "Report the incorrect information to the Barangay Office so it can be checked and updated.",
        "Website Help",
        31,
    ),
    (
        "May makakatulong ba sa akin kung hindi ko alam gamitin ang website?",
        "Can someone help me if I don't know how to use the website?",
        "Oo. Maaari kayong humingi ng gabay at tulong nang personal sa Tanggapan ng Barangay o sa mga Barangay Health Worker.",
        "Yes. You may ask for assistance at the Barangay Office.",
        "Website Help",
        32,
    ),
    (
        "Paano kung hindi ko mabuksan ang website habang may emergency?",
        "What if I cannot access the website during an emergency?",
        "Gamitin agad ang mga opisyal na emergency contact number ng barangay o iba pang magagamit na linya ng komunikasyon.",
        "Use the barangay's official emergency contact numbers or other available communication channels.",
        "Website Help",
        33,
    ),
]


async def seed_faqs(session) -> None:
    # Remove existing FAQs to reseed with canonical dataset
    await session.execute(delete(Faq))
    for q_fil, q_en, a_fil, a_en, category, sort_order in FAQ_DEFS:
        session.add(
            Faq(
                question_fil=q_fil,
                question_en=q_en,
                answer_fil=a_fil,
                answer_en=a_en,
                category=category,
                sort_order=sort_order,
                is_published=True,
            )
        )
    log.info("seeded faqs", extra={"count": len(FAQ_DEFS)})


# --- activities ---------------------------------------------------------------

ACTIVITY_DEFS = [
    (
        "Operation Stripes: San Jose Tigers Youth in Action",
        "cleanup",
        "Youth volunteers cleared storm debris and waste in Pag-Asa Village, Kasiglahan Village, helping restore a cleaner and safer community after recent flooding.",
        datetime(2026, 8, 1, 8, tzinfo=UTC),
        datetime(2026, 8, 1, 12, tzinfo=UTC),
        "Pag-Asa Village, Kasiglahan Village",
        None,
    ),
    (
        "Project Kabuhay: Kabataan para sa Buhay at Hanapbuhay",
        "ngo_program",
        "A Linggo ng Kabataan 2026 workshop on perfume and coffee making that equipped young people with practical livelihood and entrepreneurship skills.",
        datetime(2026, 8, 8, 9, tzinfo=UTC),
        datetime(2026, 8, 8, 16, tzinfo=UTC),
        "Barangay San Jose Covered Court",
        None,
    ),
    (
        "Training on Basic Life Support and Standard First Aid for Health Workers",
        "first_aid",
        "The Municipal Health Office and Philippine Red Cross – Rizal Chapter led a four-day training to strengthen health workers’ emergency and disaster-response skills.",
        datetime(2026, 7, 21, 8, tzinfo=UTC),
        datetime(2026, 7, 24, 17, tzinfo=UTC),
        "Municipal Health Office",
        None,
    ),
]


async def seed_activities(session, areas: dict[str, Area], users: dict[str, User]) -> None:
    if await _table_has_rows(session, Activity):
        return
    creator = users["Admin Demo"]
    for title, type_, description, starts_at, ends_at, venue, area_name in ACTIVITY_DEFS:
        session.add(
            Activity(
                title=title,
                type=type_,
                slug=slug_base(title),
                excerpt=description,
                body_json=plain_text_document(description),
                publication_status="published",
                published_at=starts_at,
                starts_at=starts_at,
                ends_at=ends_at,
                venue=venue,
                area_id=areas[area_name].id if area_name else None,
                created_by_user_id=creator.id,
            )
        )
    log.info("seeded activities", extra={"count": len(ACTIVITY_DEFS)})


# --- announcements ------------------------------------------------------------

ANNOUNCEMENT_DEFS = [
    (
        "announcement",
        "road_closure",
        "warning",
        "Protective Measures: Concrete Barrier Installation",
        "Concrete barriers along the shortcut to Phase 1B, Kasiglahan Village were repaired and reinforced to help protect motorists and pedestrians during adverse weather. The work was coordinated by Area 1 Alpha, the General Services Office, and the Barangay Disaster Risk Reduction and Management Office. Residents should report weather-related hazards and emergencies immediately through the appropriate hotlines.",
        datetime(2026, 8, 12, 14, tzinfo=UTC),
        "Barangay Disaster Risk Reduction and Management Committee",
        None,
    ),
    (
        "alert",
        "class_suspension",
        "info",
        "Face-to-Face Classes Resume Across Montalban Public Schools",
        "Face-to-face classes resumed on August 13, 2026 in all grade levels across Montalban public schools after schools used as evacuation centers were cleaned and restored. The reopening supports students’ safe return to learning following the recent calamity.",
        datetime(2026, 8, 13, 8, tzinfo=UTC),
        "Office of the Barangay Captain",
        "Parents and students should follow their school’s announced schedule and continue to observe school safety guidelines.",
    ),
    (
        "announcement",
        "heavy_rainfall",
        "warning",
        "Habagat Advisory and Water Level Monitoring",
        "The Southwest Monsoon continues to bring scattered rains and thunderstorms to CALABARZON, with possible flash floods and landslides in vulnerable and low-lying areas. The water level beneath San Jose Bridge remains low as of the latest monitoring, but residents should keep emergency kits ready, follow official weather advisories, review household evacuation plans, and exercise caution in hazard-prone areas.",
        datetime(2026, 8, 14, 5, 40, tzinfo=UTC),
        "Barangay Disaster Risk Reduction and Management Committee",
        None,
    ),
]


async def seed_announcements(session, users: dict[str, User]) -> None:
    if await _table_has_rows(session, Announcement):
        return
    for (
        kind,
        type_,
        severity,
        title,
        body,
        published_at,
        issuer_name,
        instruction,
    ) in ANNOUNCEMENT_DEFS:
        announcement = Announcement(
            kind=kind,
            type=type_,
            severity=severity,
            title=title,
            slug=slug_base(title),
            excerpt=body,
            body_json=plain_text_document(body),
            publication_status="published",
            is_barangay_wide=True,
            published_at=published_at,
            instruction=instruction,
            issued_by_user_id=users[issuer_name].id,
        )
        session.add(announcement)
    log.info("seeded announcements", extra={"count": len(ANNOUNCEMENT_DEFS)})


# --- donation drives ----------------------------------------------------------


async def seed_donations(session, users: dict[str, User]) -> None:
    if await _table_has_rows(session, DonationDrive):
        return

    drives = [
        (
            datetime(2026, 8, 13, 8, tzinfo=UTC),
            "Relief Drive for Habagat-Affected Families",
            "relief-drive-for-habagat-affected-families",
            "Rotaract Club of Rodriguez is collecting financial and in-kind support for families affected by Habagat in Montalban.",
            "The Rotaract Club of Rodriguez is accepting financial and in-kind donations for families affected by the Southwest Monsoon (Habagat) in Montalban. Needed items include drinking water, canned goods and ready-to-eat food, hygiene supplies, clean clothes, and blankets. Financial donations may be sent through GCash or InstaPay to Vienn Nicole Ocampo, 09524597132. Scan the QR code in the accompanying poster for payment details.",
            "Rotaract Club of Rodriguez",
            "09616499215",
            "Isabel Terraces, San Jose, Rodriguez, Rizal",
        ),
        (
            datetime(2026, 8, 12, 8, tzinfo=UTC),
            "Laban Kontra Bagyong Maymay Donation Drive",
            "laban-kontra-bagyong-maymay-donation-drive",
            "The Eagle Scouts Association of Montalban is collecting monetary and in-kind donations for people affected by Bagyong Maymay.",
            "The Eagle Scouts Association of Montalban is calling for monetary and in-kind donations for people affected by Bagyong Maymay in evacuation areas across Montalban. Needed items include first-aid kits, biscuits, clothes, toothbrushes, toothpaste, shampoo, soap, sanitary napkins, and diapers. Monetary donations may be sent through GCash to Reniel N., 09305393812.",
            "Eagle Scouts Association of Montalban",
            "Reniel N. · 09305393812",
            None,
        ),
        (
            datetime(2026, 8, 14, 8, tzinfo=UTC),
            "Upper Hills and Mountains Donation Drive",
            "upper-hills-and-mountains-donation-drive",
            "Upper Hills and Mountains is accepting donations for clothes, medicine, canned goods, money, and other essential relief items.",
            "Upper Hills and Mountains is accepting donations of clothes, medicine, canned goods, money, and other essential relief items. For coordination, contact Reniel Noel directly. Monetary donations may be sent to Reniel N., 09305393812.",
            "Upper Hills and Mountains",
            "Reniel N. · 09305393812",
            "Coordinate directly with Reniel Noel through the organization’s official social-media page.",
        ),
    ]
    for (
        published_at,
        title,
        slug,
        excerpt,
        body,
        organizer_name,
        organizer_contact,
        drop_off_instructions,
    ) in drives:
        session.add(
            DonationDrive(
                title=title,
                slug=slug,
                excerpt=excerpt,
                body_json=plain_text_document(body),
                publication_status="published",
                published_at=published_at,
                organizer_name=organizer_name,
                organizer_contact=organizer_contact,
                drop_off_instructions=drop_off_instructions,
                active_from=published_at,
                created_by_user_id=users["Admin Demo"].id,
            )
        )

    log.info("seeded donation drives", extra={"count": len(drives)})


# --- article cover media -------------------------------------------------------

# Each tuple is (model, image model, foreign-key field, article slug, filenames).
# The first image is the card cover; the remaining images retain the user-supplied
# article-gallery ordering.
ARTICLE_MEDIA_DEFS = (
    (
        Announcement,
        AnnouncementImage,
        "announcement_id",
        "protective-measures-concrete-barrier-installation",
        ("barrier-installation-1.jpg", "barrier-installation-2.jpg", "barrier-installation-3.jpg"),
    ),
    (
        Announcement,
        AnnouncementImage,
        "announcement_id",
        "face-to-face-classes-resume-across-montalban-public-schools",
        ("classes-resume-1.jpeg",),
    ),
    (
        Announcement,
        AnnouncementImage,
        "announcement_id",
        "habagat-advisory-and-water-level-monitoring",
        ("water-level-monitoring-1.jpg",),
    ),
    (
        Activity,
        ActivityImage,
        "activity_id",
        "operation-stripes-san-jose-tigers-youth-in-action",
        ("operation-stripes-1.jpg", "operation-stripes-2.jpg", "operation-stripes-3.jpg"),
    ),
    (
        Activity,
        ActivityImage,
        "activity_id",
        "project-kabuhay-kabataan-para-sa-buhay-at-hanapbuhay",
        ("project-kabuhay-1.jpeg", "project-kabuhay-2.jpeg"),
    ),
    (
        Activity,
        ActivityImage,
        "activity_id",
        "training-on-basic-life-support-and-standard-first-aid-for-health-workers",
        (
            "bls-first-aid-1.jpeg",
            "bls-first-aid-2.jpeg",
            "bls-first-aid-3.jpeg",
            "bls-first-aid-4.jpeg",
        ),
    ),
    (
        DonationDrive,
        DonationDriveImage,
        "donation_drive_id",
        "relief-drive-for-habagat-affected-families",
        ("rotaract-relief-drive.jpg",),
    ),
    (
        DonationDrive,
        DonationDriveImage,
        "donation_drive_id",
        "laban-kontra-bagyong-maymay-donation-drive",
        ("eagle-scouts-maymay-drive.jpg",),
    ),
    (
        DonationDrive,
        DonationDriveImage,
        "donation_drive_id",
        "upper-hills-and-mountains-donation-drive",
        ("upper-hills-donation-drive.jpg",),
    ),
)


async def seed_article_cover_media(session) -> None:
    """Attach bundled gallery images when an article has no managed media."""
    source_dir = Path(__file__).parent / "seed_media" / "article-covers"
    upload_dir = Path(settings.upload_dir) / "article-covers"
    upload_dir.mkdir(parents=True, exist_ok=True)

    added = 0
    for parent_model, image_model, parent_key, slug, filenames in ARTICLE_MEDIA_DEFS:
        parent = (
            await session.execute(select(parent_model).where(parent_model.slug == slug))
        ).scalar_one_or_none()
        if parent is None:
            continue
        has_media = (
            await session.execute(
                select(image_model.id).where(getattr(image_model, parent_key) == parent.id).limit(1)
            )
        ).scalar_one_or_none()
        if has_media is not None:
            continue

        for sort_order, filename in enumerate(filenames):
            source = source_dir / filename
            target = upload_dir / filename
            if not source.is_file():
                raise RuntimeError(f"Missing bundled article image: {source}")
            if not target.exists():
                copyfile(source, target)
            session.add(
                image_model(
                    **{parent_key: parent.id},
                    file_path=f"article-covers/{filename}",
                    sort_order=sort_order,
                    is_cover=sort_order == 0,
                )
            )
            added += 1
    if added:
        log.info("seeded article cover media", extra={"count": added})


# --- flood events (fixtures/flood-events.ts) -----------------------------------


def _get_flood_defs():
    return [
        (
            "Typhoon Ondoy (Ketsana)",
            datetime(2009, 9, 26, tzinfo=UTC),
            datetime(2009, 9, 29, tzinfo=UTC),
            21.5,
            datetime(2009, 9, 26, 14, tzinfo=UTC),
            1240,
            "The reference event for the whole municipality. Water reached second-floor level "
            "across most of the riverside puroks.",
            ["Area 1", "Area 2", "Area 3", "Area 4"],
        ),
        (
            "Typhoon Ulysses (Vamco)",
            datetime(2020, 11, 11, tzinfo=UTC),
            datetime(2020, 11, 14, tzinfo=UTC),
            20.7,
            datetime(2020, 11, 12, 4, tzinfo=UTC),
            980,
            "Comparable to Ondoy in river height. Earlier evacuation kept casualties lower despite "
            "similar water levels.",
            ["Area 1", "Area 2", "Area 3"],
        ),
        (
            "2025 Habagat Flooding — Prior Event",
            _now() - timedelta(days=45),
            _now() - timedelta(days=42),
            19.8,
            _now() - timedelta(days=44, hours=10),
            420,
            "Heavy monsoon rains enhanced by offshore severe tropical storm. Auto-linked from declared Emergency Event.",
            ["Area 1", "Area 2"],
        ),
    ]


async def seed_flood_events(session, areas: dict[str, Area]) -> None:
    if await _table_has_rows(session, FloodEvent):
        return
    defs = _get_flood_defs()
    # Check if emergency_event exists for linking
    ee_rows = (await session.execute(select(EmergencyEvent))).scalars().all()
    ee_by_name = {ee.name: ee.id for ee in ee_rows}

    for name, started_at, ended_at, peak, peak_at, displaced, notes, area_names in defs:
        event = FloodEvent(
            name=name,
            emergency_event_id=ee_by_name.get(name),
            started_at=started_at,
            ended_at=ended_at,
            peak_level_m=peak,
            peak_at=peak_at,
            households_displaced=displaced,
            notes=notes,
        )
        session.add(event)
        await session.flush()
        for area_name in area_names:
            if area_name in areas:
                session.add(FloodEventArea(flood_event_id=event.id, area_id=areas[area_name].id))
    log.info("seeded flood events", extra={"count": len(defs)})


# --- weather readings ------------------------------------------------------------
# Seeded so the weather/river panels are never blank, and set to actually cross
# the Montalban gauge's Level 2 threshold (23.00 m — schema.md S-OI-3) so the
# seeded "Alert Level 2" announcement above is a coherent scenario, not two
# unrelated fixtures.

PAGASA_STATION = "Montalban (Rodriguez) River Gauge"


async def seed_readings(session) -> None:
    if await _table_has_rows(session, Reading):
        return

    now = _now()
    readings = [
        ("temperature", 27.4, "°C", "open_meteo", now - timedelta(minutes=14), None, None),
        ("humidity", 89, "%", "open_meteo", now - timedelta(minutes=14), None, None),
        ("rainfall", 12.6, "mm", "open_meteo", now - timedelta(minutes=14), None, None),
        (
            "precipitation_probability",
            85,
            "%",
            "open_meteo",
            now - timedelta(minutes=14),
            None,
            None,
        ),
        ("heat_index", 31.2, "°C", "open_meteo", now - timedelta(minutes=14), None, None),
        ("river_level", 22.6, "m", "pagasa", now - timedelta(hours=1), PAGASA_STATION, None),
        ("river_level", 23.1, "m", "pagasa", now - timedelta(minutes=22), PAGASA_STATION, None),
        (
            "tcws_signal",
            0.0,
            "signal",
            "pagasa",
            now - timedelta(minutes=10),
            "Rizal",
            {
                "tc_name": "None",
                "proximity": "No Active Cyclone in PAR / Rizal",
                "wind_speed_range": "Normal winds (0-38 km/h)",
                "description": "No Tropical Cyclone Wind Signal currently hoisted over Rizal.",
            },
        ),
    ]
    for metric, value, unit, source, observed_at, station, raw in readings:
        session.add(
            Reading(
                source=source,
                metric=metric,
                value=value,
                unit=unit,
                station=station,
                observed_at=observed_at,
                fetched_at=observed_at,
                raw=raw,
            )
        )

    for hours_ahead, value in [(3, 9.2), (6, 14.8), (9, 18.1), (12, 11.4), (15, 6.7), (18, 3.1)]:
        session.add(
            Forecast(
                source="open_meteo",
                metric="rainfall",
                value=value,
                unit="mm",
                valid_at=now + timedelta(hours=hours_ahead),
                horizon="hourly",
                fetched_at=now - timedelta(minutes=14),
            )
        )
    log.info("seeded readings and forecast", extra={"count": len(readings)})


# --- households + members (synthetic, for real counts — no registry UI) -------

FIRST_NAMES = [
    "Juan",
    "Maria",
    "Jose",
    "Ana",
    "Pedro",
    "Rosa",
    "Carlos",
    "Elena",
    "Miguel",
    "Sofia",
]
LAST_NAMES = [
    "Santos",
    "Reyes",
    "Cruz",
    "Bautista",
    "Garcia",
    "Torres",
    "Flores",
    "Ramos",
    "Mendoza",
    "Castillo",
]


async def seed_households(session, areas: dict[str, Area]) -> None:
    if await _table_has_rows(session, Household):
        # Older demo databases were seeded before household pins were added.
        # Backfill only clearly synthetic rows; never rewrite resident/BHW data.
        await session.execute(
            update(Household)
            .where(
                Household.reference_no.like("HH-SEED-%"),
                Household.location.is_(None),
            )
            .values(
                location=(
                    select(func.ST_PointOnSurface(Area.geom))
                    .where(Area.id == Household.area_id)
                    .scalar_subquery()
                )
            )
        )
        return

    # `seed()` commits each reference-data phase. Refresh the instances carried
    # from `seed_areas` before using their geometry in SQL expressions; otherwise
    # an expired async ORM attribute attempts implicit I/O outside a greenlet.
    for area in areas.values():
        await session.refresh(area, attribute_names=["geom"])

    rng = random.Random(2026)  # deterministic — reruns produce the same synthetic set
    area_list = list(areas.values())
    total = 0

    for i in range(1, 201):
        area = area_list[i % len(area_list)]
        head_name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if area.flood_exposure == "high":
            r = rng.random()
            proximity = "very_near" if r < 0.55 else ("near" if r < 0.90 else "far")
        elif area.flood_exposure == "low":
            r = rng.random()
            proximity = "far" if r < 0.60 else ("near" if r < 0.90 else "very_near")
        else:
            r = rng.random()
            proximity = "near" if r < 0.55 else ("very_near" if r < 0.75 else "far")

        household = Household(
            reference_no=format_household_number(i),
            head_name=head_name,
            contact_number=None if rng.random() < 0.1 else f"09{rng.randint(100000000, 999999999)}",
            is_unreachable_by_phone=rng.random() < 0.1,
            area_id=area.id,
            # Keep synthetic demo pins inside the seeded area polygon so the
            # registry map and boundary resolver agree. This is a planning
            # point, not a real household address.
            location=func.ST_PointOnSurface(area.geom),
            waterway_proximity=proximity,
            source="bhw",
        )
        session.add(household)
        await session.flush()

        today_date = _now().date()
        head_is_senior = rng.random() < 0.15
        head_age = rng.randint(60, 80) if head_is_senior else rng.randint(22, 59)
        head_birth = today_date - timedelta(days=head_age * 365 + rng.randint(0, 360))
        session.add(
            Member(
                household_id=household.id,
                full_name=head_name,
                birth_date=head_birth,
                is_head=True,
                sex=rng.choice(["male", "female"]),
                is_senior=head_is_senior,
            )
        )
        for _ in range(rng.randint(1, 4)):
            is_ch = rng.random() < 0.3
            is_snr = False if is_ch else (rng.random() < 0.1)
            if is_ch:
                # 40% infant/toddler (0-4), 60% child (5-17)
                ch_age = rng.randint(0, 4) if rng.random() < 0.4 else rng.randint(5, 17)
                m_birth = today_date - timedelta(days=ch_age * 365 + rng.randint(0, 360))
            elif is_snr:
                snr_age = rng.randint(60, 85)
                m_birth = today_date - timedelta(days=snr_age * 365 + rng.randint(0, 360))
            else:
                ad_age = rng.randint(18, 59)
                m_birth = today_date - timedelta(days=ad_age * 365 + rng.randint(0, 360))

            session.add(
                Member(
                    household_id=household.id,
                    full_name=f"{rng.choice(FIRST_NAMES)} {head_name.split()[-1]}",
                    birth_date=m_birth,
                    sex=rng.choice(["male", "female"]),
                    is_child=is_ch,
                    is_senior=is_snr,
                    is_pwd=rng.random() < 0.05,
                    is_pregnant=rng.random() < 0.03,
                    has_chronic_condition=rng.random() < 0.08,
                    is_bedridden=rng.random() < 0.02,
                )
            )
        total += 1

    # Reserve the seeded range before the first real registration.
    await session.execute(select(func.setval("household_reference_no_seq", total, True)))
    log.info("seeded synthetic households", extra={"count": total})


# --- safety (S6 demo wiring) -----------------------------------------------------
# Against a second, *inactive* event, deliberately — the queue and the
# unregistered-persons list read non-empty the moment an officer declares an
# event, rather than the demo's first click landing on an empty screen.


async def seed_safety(session, users: dict[str, User]) -> None:
    if await _table_has_rows(session, RescueRequest):
        return

    event = EmergencyEvent(
        name="2025 Habagat Flooding — Prior Event",
        type="flood",
        started_at=_now() - timedelta(days=45),
        ended_at=_now() - timedelta(days=42),
        is_active=False,
        declared_by_user_id=users["Barangay Disaster Risk Reduction and Management Committee"].id,
    )
    session.add(event)
    await session.flush()

    bedridden_household = (
        await session.execute(
            select(Household)
            .join(Member, Member.household_id == Household.id)
            .where(Member.is_bedridden.is_(True), Household.contact_number.is_not(None))
            .limit(1)
        )
    ).scalar_one_or_none()

    session.add_all(
        [
            UnregisteredPerson(
                event_id=event.id,
                full_name="Rosario Manalastas",
                contact_number="09171234567",
                location=func.ST_SetSRID(func.ST_MakePoint(121.1339, 14.7318), 4326),
                recorded_by_user_id=users["BHW Demo"].id,
            ),
            UnregisteredPerson(
                event_id=event.id,
                full_name="Boy Santos (no phone)",
                location_note="Sari-sari store beside the chapel, Purok 3",
                recorded_by_user_id=users["BHW Demo"].id,
            ),
        ]
    )

    rescue_requests = [
        RescueRequest(
            event_id=event.id,
            requester_name="Neighbor calling for the Reyes household",
            contact_number=bedridden_household.contact_number if bedridden_household else None,
            description=(
                "Calling on behalf of a neighbor with a bedridden family member — "
                "water is rising past their gate and they cannot carry him out alone."
            ),
            people_count=4,
            location=func.ST_SetSRID(func.ST_MakePoint(121.1305, 14.7295), 4326),
        ),
        RescueRequest(
            event_id=event.id,
            requester_name="Anonymous caller",
            description="Family stranded on their roof, no landmark given over the phone.",
            location_note="Near the old basketball court along the riverbank",
            people_count=3,
        ),
        RescueRequest(
            event_id=event.id,
            requester_name="Household head, registered resident",
            contact_number="09201234567",
            description="Water is knee-deep and still rising; requesting boat rescue.",
            people_count=5,
            location=func.ST_SetSRID(func.ST_MakePoint(121.1322, 14.7331), 4326),
        ),
    ]
    session.add_all(rescue_requests)
    log.info(
        "seeded safety demo data",
        extra={
            "unregistered": 2,
            "rescue_requests": 3,
            "matched_bedridden": bedridden_household is not None,
        },
    )


async def seed_incident_reports(session, users: dict[str, User]) -> None:
    """Provide a deliberately varied operational queue for the admin demo."""
    if await _table_has_rows(session, IncidentReport):
        return

    event = (
        await session.execute(
            select(EmergencyEvent)
            .order_by(EmergencyEvent.is_active.desc(), EmergencyEvent.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    households = (
        (
            await session.execute(
                select(Household).where(Household.head_user_id.is_not(None)).limit(3)
            )
        )
        .scalars()
        .all()
    )
    reporter_ids = [household.head_user_id for household in households]
    admin = users["Barangay Disaster Risk Reduction and Management Committee"]
    now = _now()

    media_source = (
        Path(__file__).parent / "seed_media" / "incident-reports" / "flooded-lane-obstruction.png"
    )
    media_target = Path(settings.upload_dir) / "incident-reports" / "flooded-lane-obstruction.png"
    if media_source.exists() and not media_target.exists():
        media_target.parent.mkdir(parents=True, exist_ok=True)
        copyfile(media_source, media_target)

    reports = [
        IncidentReport(
            event_id=event.id if event else None,
            reported_by_user_id=reporter_ids[0] if reporter_ids else None,
            type="flooding",
            description=(
                "Floodwater has entered the ground-floor homes near the lane. A fallen branch is "
                "blocking the only passable exit."
            ),
            location=func.ST_SetSRID(func.ST_MakePoint(121.1335, 14.7374), 4326),
            location_note="Near the covered court access road, Kasiglahan Village",
            photo_path=(
                "incident-reports/flooded-lane-obstruction.png" if media_source.exists() else None
            ),
        ),
        IncidentReport(
            event_id=None,
            reported_by_user_id=reporter_ids[1] if len(reporter_ids) > 1 else None,
            type="power_outage",
            description=(
                "Power has been out since early morning. The caller could not safely share a "
                "map pin."
            ),
            location_note="Block 8, Phase 1A, ask for the blue sari-sari store",
        ),
        IncidentReport(
            event_id=event.id if event else None,
            reported_by_user_id=reporter_ids[2] if len(reporter_ids) > 2 else None,
            type="fallen_tree",
            description="A tree limb is resting on the roadside power line and needs assessment.",
            location=func.ST_SetSRID(func.ST_MakePoint(121.1402, 14.7448), 4326),
            status="verified",
            verified_by_user_id=admin.id,
            verified_at=now - timedelta(hours=2),
        ),
        IncidentReport(
            event_id=event.id if event else None,
            type="road_blockage",
            description=(
                "Construction debris and floodwater have closed one lane; residents are using a "
                "narrow shoulder."
            ),
            location=func.ST_SetSRID(func.ST_MakePoint(121.1294, 14.7404), 4326),
            status="in_progress",
            verified_by_user_id=admin.id,
            verified_at=now - timedelta(hours=5),
        ),
        IncidentReport(
            event_id=event.id if event else None,
            type="flooding",
            description="Drainage overflow near the school gate was reported after heavy rain.",
            location=func.ST_SetSRID(func.ST_MakePoint(121.1348, 14.7303), 4326),
            status="resolved",
            verified_by_user_id=admin.id,
            verified_at=now - timedelta(days=1, hours=2),
            resolved_at=now - timedelta(days=1),
            resolution_note=(
                "Barangay maintenance cleared the drain and the area was checked after rainfall."
            ),
        ),
        IncidentReport(
            event_id=None,
            type="other",
            description="Caller reported smoke near a vacant lot but could not confirm a source.",
            location_note="Vacant lot behind the old tricycle terminal",
            status="dismissed",
            dismissal_reason="Follow-up found no active hazard at the described location.",
        ),
    ]
    session.add_all(reports)
    log.info("seeded incident-report demo data", extra={"incident_reports": len(reports)})


async def clear_public_content(session) -> None:
    """Remove public article content before an explicitly requested demo refresh."""
    await session.execute(delete(ActivityImage))
    await session.execute(delete(AnnouncementImage))
    await session.execute(delete(DonationDriveImage))
    await session.execute(delete(Activity))
    await session.execute(delete(Announcement))
    await session.execute(delete(DonationDrive))
    log.info("cleared public article content for demo refresh")


async def seed(*, replace_public_content: bool = False) -> None:
    async with SessionLocal() as session:
        areas = await seed_areas(session)
        await session.commit()

        users = await seed_users(session, areas)
        await session.commit()

        await seed_hotlines(session)
        await session.commit()

        facilities = await seed_facilities(session, areas)
        await session.commit()

        await seed_evac_centers(session, facilities)
        await session.commit()

        await seed_guides(session)
        await seed_faqs(session)
        await session.commit()

        if replace_public_content:
            await clear_public_content(session)
            await session.commit()

        await seed_activities(session, areas, users)
        await session.commit()

        await seed_announcements(session, users)
        await session.commit()

        await seed_donations(session, users)
        await session.commit()

        await seed_article_cover_media(session)
        await session.commit()

        await seed_flood_events(session, areas)
        await session.commit()

        await seed_readings(session)
        await session.commit()

        await seed_households(session, areas)
        await session.commit()

        await seed_safety(session, users)
        await session.commit()

        await seed_incident_reports(session, users)
        await session.commit()

    await engine.dispose()
    log.info("seed complete")


def main() -> None:
    parser = argparse.ArgumentParser(description="Load SAGIP-SJ demo data.")
    parser.add_argument(
        "--replace-public-content",
        action="store_true",
        help="delete all activities, announcements, donation notices, and their media first",
    )
    args = parser.parse_args()
    configure_logging()
    asyncio.run(seed(replace_public_content=args.replace_public_content))


if __name__ == "__main__":
    main()
