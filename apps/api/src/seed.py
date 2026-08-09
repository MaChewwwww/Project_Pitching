"""Seed data loader — `make seed`.

Reference data is loaded by migration, not at runtime (NFR-DAT-007); this module
handles the *demo* dataset instead: synthetic content and households, everything
marked or clearly identifiable as such (NFR-DAT-006, NFR-PRV-007).

It exists so the public site reads identically the morning after the fixture→API
swap as it did the night before — every row below is a direct transcription of
`apps/web/src/lib/fixtures/*.ts`, same copy, same shape.

**Idempotent.** Each section checks whether its table already has rows and skips
if so, so `make seed` twice is harmless. This is not run automatically anywhere
(AGENTS.md Section 1) — it is an explicit command, same as a migration but never
confused with one: this is throwaway demo content, not schema.
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from src.core.logging import configure_logging
from src.core.security import hash_password

# Importing the registry (not just the individual modules used below) puts every
# model into `Base.metadata` before any flush. Skipping this is exactly the trap
# `db/models_registry.py` warns about: `household.psgc_barangay_code` FKs to
# `psgc`, and if `config.models` (which owns `Psgc`) never got imported, SQLAlchemy
# cannot resolve that string-based ForeignKey at flush time.
from src.db.models_registry import Base  # noqa: F401
from src.db.session import SessionLocal, engine
from src.modules.activities.models import Activity
from src.modules.alerts.models import Announcement, AnnouncementArea
from src.modules.donations.models import Donation, DonationDrive, DriveNeed
from src.modules.evacuation.models import EmergencyEvent, EvacCenter
from src.modules.geo.models import Area, Facility, Hotline
from src.modules.preparedness.models import Faq, Guide
from src.modules.registry.models import Household, Member
from src.modules.safety.models import RescueRequest, UnregisteredPerson
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

    areas = {}
    for name, code, exposure in AREA_DEFS:
        area = Area(name=name, code=code, flood_exposure=exposure)  # geom null — BRD OI-3
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
    ("Barangay San Jose Office", "(02) 8555-0100", "barangay", 1),
    ("Barangay Emergency Response", "0917-555-0101", "rescue", 2),
    ("Rodriguez MDRRMO", "(02) 8555-0102", "mdrrmo", 3),
    ("Police Station", "(02) 8555-0103", "police", 4),
    ("Bureau of Fire Protection", "(02) 8555-0104", "fire", 5),
    ("Ambulance Dispatch", "0917-555-0105", "ambulance", 6),
    ("Rodriguez District Hospital", "(02) 8555-0106", "hospital", 7),
]


async def seed_hotlines(session) -> None:
    if await _table_has_rows(session, Hotline):
        return
    for label, number, type_, sort_order in HOTLINE_DEFS:
        session.add(Hotline(label=label, number=number, type=type_, sort_order=sort_order))
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
    (
        "San Jose Elementary School",
        "evacuation_center",
        "Purok 2, Barangay San Jose",
        "(02) 8555-0110",
        121.1318,
        14.7371,
        "Area 2",
    ),
    (
        "San Jose National High School",
        "evacuation_center",
        "Purok 5, Barangay San Jose",
        "(02) 8555-0111",
        121.1389,
        14.7334,
        "Area 4",
    ),
    (
        "Barangay Covered Court",
        "evacuation_center",
        "Purok 1, Barangay San Jose",
        None,
        121.1357,
        14.7344,
        "Area 1",
    ),
    (
        "San Jose Multi-Purpose Hall",
        "evacuation_center",
        "Purok 7, Barangay San Jose",
        None,
        121.1402,
        14.7318,
        "Area 5",
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

EVAC_CENTER_DEFS = [
    (
        "San Jose Elementary School",
        320,
        True,
        "Ground floor reserved for seniors and persons with disabilities.",
    ),
    (
        "San Jose National High School",
        450,
        True,
        "Largest capacity. Covered parking available for evacuee vehicles.",
    ),
    ("Barangay Covered Court", 180, True, None),
    (
        "San Jose Multi-Purpose Hall",
        140,
        False,
        "Currently closed for roof repair. Reopens once works are complete.",
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
    (
        "Paano ako makakapagparehistro ng aking sambahayan?",
        "How do I register my household?",
        "Ang online na pagpaparehistro ay hindi pa bukas. Sa ngayon, maaari kayong "
        "magparehistro nang"
        "personal sa barangay hall tuwing Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM.",
        "Online registration is not open yet. For now you can register in person at the barangay "
        "hall, Monday to Friday, 8:00 AM to 5:00 PM.",
        "Registration",
        1,
    ),
    (
        "Bakit kailangang magparehistro?",
        "Why should I register?",
        "Ang rehistro ang ginagamit ng barangay upang malaman kung sino ang nasa mga lugar na "
        "madaling"
        "bahain at ilan ang inaasahang darating sa bawat evacuation center.",
        "The barangay uses the registry to know who lives in flood-prone areas and how many people "
        "to expect at each evacuation centre.",
        "Registration",
        2,
    ),
    (
        "Saan ang pinakamalapit na evacuation center?",
        "Where is the nearest evacuation centre?",
        "Nakalista sa pahinang ito ang lahat ng evacuation center kasama ang kanilang address "
        "at kapasidad.",
        "Every evacuation centre is listed on this site with its address and capacity.",
        "Emergencies",
        3,
    ),
    (
        "Ano ang ibig sabihin ng Alert Level 1, 2, at 3?",
        "What do Alert Levels 1, 2 and 3 mean?",
        "Ang Alert Level 1 ay Paghahanda, ang Level 2 ay Lumikas, at ang Level 3 ay Sapilitang "
        "Paglikas.",
        "Alert Level 1 means Prepare, Level 2 means Evacuate, and Level 3 means Forced Evacuation.",
        "Emergencies",
        4,
    ),
    (
        "Paano ako mag-uulat ng insidente o hihingi ng tulong?",
        "How do I report an incident or ask for rescue?",
        "Sa isang emergency, tumawag sa hotline ng barangay. Ito ang pinakamabilis at "
        "pinaka-maaasahang paraan.",
        "In an emergency, call the barangay hotline. That is the fastest and most reliable route.",
        "Emergencies",
        5,
    ),
    (
        "Ano ang dapat na laman ng Go Bag?",
        "What should be inside my Go Bag?",
        "Tubig at pagkain para sa tatlong araw, kopya ng mga dokumento, at flashlight.",
        "Three days of water and food, copies of your documents, and a flashlight.",
        "Preparedness",
        6,
    ),
    (
        "Paano ako makakapagbigay ng donasyon?",
        "How can I donate?",
        "Tumatanggap ang barangay ng mga bagay na kailangan gaya ng pagkain, tubig, at kumot.",
        "The barangay accepts goods such as food, water and blankets.",
        "Donations",
        7,
    ),
    (
        "Ang impormasyon ba ng aking pamilya ay makikita ng publiko?",
        "Is my family's information visible to the public?",
        "Hindi. Walang pangalan, address, o anumang detalye ng sambahayan ang lumalabas sa "
        "pampublikong pahinang ito.",
        "No. No name, address, or household detail appears anywhere on this public site.",
        "Privacy",
        8,
    ),
]


async def seed_faqs(session) -> None:
    if await _table_has_rows(session, Faq):
        return
    for q_fil, q_en, a_fil, a_en, category, sort_order in FAQ_DEFS:
        session.add(
            Faq(
                question_fil=q_fil,
                question_en=q_en,
                answer_fil=a_fil,
                answer_en=a_en,
                category=category,
                sort_order=sort_order,
            )
        )
    log.info("seeded faqs", extra={"count": len(FAQ_DEFS)})


# --- activities (fixtures/activities.ts) ---------------------------------------

ACTIVITY_DEFS = [
    (
        "Barangay-wide Earthquake Drill",
        "drill",
        "A simultaneous Duck, Cover and Hold drill across all puroks, followed by an evacuation "
        "walkthrough.",
        4,
        "All puroks — assembly at Barangay Covered Court",
        None,
    ),
    (
        "Basic First Aid and CPR Training",
        "first_aid",
        "Hands-on session run by the Philippine Red Cross. Limited to 40 participants.",
        9,
        "Barangay San Jose Hall, Session Room",
        None,
    ),
    (
        "Riverbank Clean-Up Drive",
        "cleanup",
        "Clearing debris from the drainage channels before the next heavy rainfall.",
        13,
        "Riverside Road, Purok 2 to Purok 6",
        "Area 1",
    ),
    (
        "Disaster Preparedness Seminar for Households",
        "seminar",
        "Go Bag preparation, evacuation routes, and how the barangay alert levels work.",
        18,
        "San Jose Elementary School, Covered Court",
        None,
    ),
    (
        "Tree Planting along the Riverbank",
        "tree_planting",
        "Bamboo and native species planting to slow erosion along the riverbank.",
        24,
        "Riverbank, Purok 6",
        "Area 6",
    ),
]


async def seed_activities(session, areas: dict[str, Area], users: dict[str, User]) -> None:
    if await _table_has_rows(session, Activity):
        return
    creator = users["Admin Demo"]
    for title, type_, description, days_ahead, venue, area_name in ACTIVITY_DEFS:
        session.add(
            Activity(
                title=title,
                type=type_,
                description=description,
                starts_at=_now() + timedelta(days=days_ahead),
                ends_at=_now() + timedelta(days=days_ahead, hours=3),
                venue=venue,
                area_id=areas[area_name].id if area_name else None,
                created_by_user_id=creator.id,
                is_published=True,
            )
        )
    log.info("seeded activities", extra={"count": len(ACTIVITY_DEFS)})


# --- announcements (fixtures/announcements.ts) ---------------------------------

ANNOUNCEMENT_DEFS = [
    (
        "alert",
        "flood_warning",
        "emergency",
        2,
        "Alert Level 2 — Evacuate riverside areas now",
        "The river has risen past the Level 2 threshold and continues to climb. Residents in "
        "Areas 1 and 2 must move to an evacuation centre now.",
        "Go to San Jose Elementary School or the Barangay Covered Court now. Bring your Go Bag, "
        "IDs, and medication.",
        False,
        -2,
        10,
        None,
        ["Area 1", "Area 2"],
        "Barangay Disaster Risk Reduction and Management Committee",
    ),
    (
        "announcement",
        "class_suspension",
        "warning",
        None,
        "Classes suspended in all levels tomorrow",
        "Following the Alert Level 2 declaration, classes in all public and private schools are "
        "suspended for tomorrow.",
        None,
        True,
        -3,
        20,
        None,
        [],
        "Office of the Barangay Captain",
    ),
    (
        "announcement",
        "road_closure",
        "warning",
        None,
        "Riverside Road impassable to all vehicles",
        "Riverside Road between Purok 2 and Purok 6 is impassable due to floodwater. Use the "
        "Quirino Highway route instead.",
        None,
        False,
        -5,
        None,
        None,
        ["Area 1", "Area 2"],
        "Barangay Public Safety Office",
    ),
    (
        "announcement",
        "utility_interruption",
        "info",
        None,
        "Scheduled water interruption, Saturday 8:00 AM to 4:00 PM",
        "Manila Water will carry out pipeline maintenance affecting Areas 3, 4 and 5. Store "
        "enough water for the day.",
        None,
        False,
        -24,
        None,
        None,
        ["Area 3", "Area 4", "Area 5"],
        "Office of the Barangay Captain",
    ),
    (
        "announcement",
        "general",
        "info",
        None,
        "Household registration now open at the barangay hall",
        "Barangay Health Workers are assisting residents with household registration every "
        "weekday, 8:00 AM to 5:00 PM.",
        None,
        True,
        -72,
        None,
        None,
        [],
        "Barangay Health Office",
    ),
    (
        "announcement",
        "general",
        "info",
        None,
        "Free first aid training — limited slots",
        "The Philippine Red Cross will run a basic first aid and CPR session at the barangay "
        "hall. Slots limited to 40.",
        None,
        True,
        -120,
        None,
        None,
        [],
        "Sangguniang Kabataan",
    ),
    (
        "alert",
        "heavy_rainfall",
        "warning",
        1,
        "Alert Level 1 — Prepare to evacuate",
        "Continuous heavy rainfall has pushed the river past the Level 1 threshold. This is a "
        "preparation notice.",
        "Prepare your Go Bag and identification documents. Move valuables and appliances to "
        "higher ground.",
        False,
        -48,
        None,
        -48,
        ["Area 1", "Area 2"],
        "Barangay Disaster Risk Reduction and Management Committee",
    ),
]


async def seed_announcements(session, areas: dict[str, Area], users: dict[str, User]) -> None:
    if await _table_has_rows(session, Announcement):
        return
    for (
        kind,
        type_,
        severity,
        alert_level,
        title,
        body,
        instruction,
        is_barangay_wide,
        published_hours_ago,
        expires_hours_ahead,
        deactivated_hours_ago,
        area_names,
        issuer_name,
    ) in ANNOUNCEMENT_DEFS:
        announcement = Announcement(
            kind=kind,
            type=type_,
            severity=severity,
            alert_level=alert_level,
            title=title,
            body=body,
            instruction=instruction,
            is_barangay_wide=is_barangay_wide,
            published_at=_now() + timedelta(hours=published_hours_ago),
            expires_at=_now() + timedelta(hours=expires_hours_ahead)
            if expires_hours_ahead
            else None,
            deactivated_at=_now() + timedelta(hours=deactivated_hours_ago)
            if deactivated_hours_ago
            else None,
            issued_by_user_id=users[issuer_name].id,
        )
        session.add(announcement)
        await session.flush()
        for area_name in area_names:
            session.add(
                AnnouncementArea(announcement_id=announcement.id, area_id=areas[area_name].id)
            )
    log.info("seeded announcements", extra={"count": len(ANNOUNCEMENT_DEFS)})


# --- donation drives (fixtures/donation-drives.ts) -----------------------------


async def seed_donations(session, users: dict[str, User]) -> None:
    if await _table_has_rows(session, DonationDrive):
        return

    event = EmergencyEvent(
        name="Continuous Heavy Rainfall — Riverside Areas",
        type="flood",
        started_at=_now() - timedelta(days=3),
        is_active=False,
        declared_by_user_id=users["Barangay Disaster Risk Reduction and Management Committee"].id,
    )
    session.add(event)
    await session.flush()

    drive1 = DonationDrive(
        event_id=event.id,
        title="Relief Goods for Riverside Households",
        description=(
            "Supporting the households in Areas 1 and 2 currently sheltering "
            "at San Jose Elementary School."
        ),
        status="open",
        opened_at=_now() - timedelta(days=3),
        created_by_user_id=users["Admin Demo"].id,
    )
    drive2 = DonationDrive(
        title="Go Bag Supplies for Priority Households",
        description=(
            "Building ready-to-issue Go Bags for households with seniors, "
            "infants, or members who need help evacuating."
        ),
        status="open",
        opened_at=_now() - timedelta(days=11),
        created_by_user_id=users["Admin Demo"].id,
    )
    session.add_all([drive1, drive2])
    await session.flush()

    needs = [
        (drive1, "Rice", 400, "kg", 285, 340),
        (drive1, "Canned goods", 600, "cans", 512, 640),
        (drive1, "Drinking water", 500, "litres", 190, 420),
        (drive1, "Blankets", 200, "pcs", 64, 150),
        (drive2, "Flashlights", 150, "pcs", 138, 145),
        (drive2, "Power banks", 120, "pcs", 41, 88),
        (drive2, "First aid kits", 150, "kits", 96, 120),
    ]
    for drive, item_name, target, unit, received, pledged in needs:
        need = DriveNeed(drive_id=drive.id, item_name=item_name, target_quantity=target, unit=unit)
        session.add(need)
        await session.flush()
        if received:
            session.add(
                Donation(
                    drive_id=drive.id,
                    drive_need_id=need.id,
                    reference_no=f"DON-SEED-{need.id.hex[:8].upper()}",
                    donor_name="Multiple donors (aggregated seed figure)",
                    item_name=item_name,
                    quantity_pledged=pledged,
                    quantity_received=received,
                    unit=unit,
                    status="received",
                    is_walk_in=True,
                    status_changed_by_user_id=users["Admin Demo"].id,
                    status_changed_at=_now(),
                )
            )
    log.info("seeded donation drives", extra={"count": 2})


# --- flood events (fixtures/flood-events.ts) -----------------------------------

FLOOD_EVENT_DEFS = [
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
]


async def seed_flood_events(session, areas: dict[str, Area]) -> None:
    if await _table_has_rows(session, FloodEvent):
        return
    for name, started_at, ended_at, peak, peak_at, displaced, notes, area_names in FLOOD_EVENT_DEFS:
        event = FloodEvent(
            name=name,
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
            session.add(FloodEventArea(flood_event_id=event.id, area_id=areas[area_name].id))
    log.info("seeded flood events", extra={"count": len(FLOOD_EVENT_DEFS)})


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
        ("temperature", 27.4, "°C", "open_meteo", now - timedelta(minutes=14), None),
        ("humidity", 89, "%", "open_meteo", now - timedelta(minutes=14), None),
        ("rainfall", 12.6, "mm", "open_meteo", now - timedelta(minutes=14), None),
        ("precipitation_probability", 85, "%", "open_meteo", now - timedelta(minutes=14), None),
        ("heat_index", 31.2, "°C", "open_meteo", now - timedelta(minutes=14), None),
        ("river_level", 22.6, "m", "pagasa", now - timedelta(hours=1), PAGASA_STATION),
        ("river_level", 23.1, "m", "pagasa", now - timedelta(minutes=22), PAGASA_STATION),
    ]
    for metric, value, unit, source, observed_at, station in readings:
        session.add(
            Reading(
                source=source,
                metric=metric,
                value=value,
                unit=unit,
                station=station,
                observed_at=observed_at,
                fetched_at=observed_at,
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
        return

    rng = random.Random(2026)  # deterministic — reruns produce the same synthetic set
    area_list = list(areas.values())
    total = 0

    for i in range(1, 201):
        area = area_list[i % len(area_list)]
        head_name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        household = Household(
            reference_no=f"HH-SEED-{i:05d}",
            head_name=head_name,
            contact_number=None if rng.random() < 0.1 else f"09{rng.randint(100000000, 999999999)}",
            is_unreachable_by_phone=rng.random() < 0.1,
            area_id=area.id,
            source="bhw",
        )
        session.add(household)
        await session.flush()

        session.add(
            Member(
                household_id=household.id,
                full_name=head_name,
                is_head=True,
                sex=rng.choice(["male", "female"]),
                is_senior=rng.random() < 0.15,
            )
        )
        for _ in range(rng.randint(1, 4)):
            session.add(
                Member(
                    household_id=household.id,
                    full_name=f"{rng.choice(FIRST_NAMES)} {head_name.split()[-1]}",
                    sex=rng.choice(["male", "female"]),
                    is_child=rng.random() < 0.3,
                    is_senior=rng.random() < 0.1,
                    is_pwd=rng.random() < 0.05,
                    is_pregnant=rng.random() < 0.03,
                    has_chronic_condition=rng.random() < 0.08,
                    is_bedridden=rng.random() < 0.02,
                )
            )
        total += 1

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


async def seed() -> None:
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

        await seed_activities(session, areas, users)
        await session.commit()

        await seed_announcements(session, areas, users)
        await session.commit()

        await seed_donations(session, users)
        await session.commit()

        await seed_flood_events(session, areas)
        await session.commit()

        await seed_readings(session)
        await session.commit()

        await seed_households(session, areas)
        await session.commit()

        await seed_safety(session, users)
        await session.commit()

    await engine.dispose()
    log.info("seed complete")


def main() -> None:
    configure_logging()
    asyncio.run(seed())


if __name__ == "__main__":
    main()
