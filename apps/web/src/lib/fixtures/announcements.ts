import type { PublicAnnouncement } from "@/lib/api/public-types";
import { AREAS } from "./areas";
import { daysAgo, hoursAgo, hoursAhead } from "./clock";

/**
 * Announcements and alerts (FR-ALT-*, FR-PUB-003).
 *
 * One table, two presentations. `kind: "alert"` renders in the danger palette and
 * can take over the top of the page (FR-PUB-017); `kind: "announcement"` is a
 * routine card. An alert always carries an `instruction` — the database enforces
 * it with `chk_alert_needs_instruction`, because an alert that tells you something
 * is wrong without telling you what to do is not an alert (FR-ALT-005).
 *
 * `issued_by_name` is present and `issued_by_user_id` is not: FR-ALT-007 requires
 * the issuing officer be attributed, but the internal id is nobody's business.
 */

/** Areas 1 and 2 — the two the fixture treats as high flood exposure. */
const RIVERSIDE_AREAS = [AREAS[0].name, AREAS[1].name];

export const ANNOUNCEMENTS: PublicAnnouncement[] = [
  {
    id: "e1000000-0000-4000-8000-000000000001",
    kind: "alert",
    type: "flood_warning",
    severity: "emergency",
    alert_level: 2,
    title: "Alert Level 2 — Evacuate riverside areas now",
    body: "The river has risen past the Level 2 threshold and continues to climb. Residents in Areas 1 and 2, particularly households within 50 metres of the riverbank, must move to an evacuation centre now.",
    instruction:
      "Proceed to San Jose Elementary School or the Barangay Covered Court immediately. Bring your Go Bag, identification, and any maintenance medication. Do not wait for water to reach your doorstep.",
    is_barangay_wide: false,
    published_at: hoursAgo(2),
    expires_at: hoursAhead(10),
    deactivated_at: null,
    area_names: RIVERSIDE_AREAS,
    issued_by_name: "Barangay Disaster Risk Reduction and Management Committee",
    is_active: true,
  },
  {
    id: "e1000000-0000-4000-8000-000000000002",
    kind: "announcement",
    type: "class_suspension",
    severity: "warning",
    alert_level: null,
    title: "Classes suspended in all levels tomorrow",
    body: "Following the Alert Level 2 declaration, classes in all public and private schools within Barangay San Jose are suspended for tomorrow. The suspension will be reviewed at 5:00 AM and residents will be notified here.",
    instruction: null,
    is_barangay_wide: true,
    published_at: hoursAgo(3),
    expires_at: hoursAhead(20),
    deactivated_at: null,
    area_names: [],
    issued_by_name: "Office of the Barangay Captain",
    is_active: true,
  },
  {
    id: "e1000000-0000-4000-8000-000000000003",
    kind: "announcement",
    type: "road_closure",
    severity: "warning",
    alert_level: null,
    title: "Riverside Road impassable to all vehicles",
    body: "Riverside Road between Purok 2 and Purok 6 is impassable due to floodwater. Use the Quirino Highway route instead. Barangay tanods are posted at both ends of the closure.",
    instruction: null,
    is_barangay_wide: false,
    published_at: hoursAgo(5),
    expires_at: null,
    deactivated_at: null,
    area_names: RIVERSIDE_AREAS,
    issued_by_name: "Barangay Public Safety Office",
    is_active: true,
  },
  {
    id: "e1000000-0000-4000-8000-000000000004",
    kind: "announcement",
    type: "utility_interruption",
    severity: "info",
    alert_level: null,
    title: "Scheduled water interruption, Saturday 8:00 AM to 4:00 PM",
    body: "Manila Water will carry out pipeline maintenance affecting Areas 3, 4 and 5. Store enough water for the day. Service resumes by 4:00 PM barring complications.",
    instruction: null,
    is_barangay_wide: false,
    published_at: daysAgo(1),
    expires_at: null,
    deactivated_at: null,
    area_names: [AREAS[2].name, AREAS[3].name, AREAS[4].name],
    issued_by_name: "Office of the Barangay Captain",
    is_active: true,
  },
  {
    id: "e1000000-0000-4000-8000-000000000005",
    kind: "announcement",
    type: "general",
    severity: "info",
    alert_level: null,
    title: "Household registration now open at the barangay hall",
    body: "Barangay Health Workers are assisting residents with household registration every weekday, 8:00 AM to 5:00 PM. Registration helps the barangay plan evacuations and reach vulnerable households first during an emergency.",
    instruction: null,
    is_barangay_wide: true,
    published_at: daysAgo(3),
    expires_at: null,
    deactivated_at: null,
    area_names: [],
    issued_by_name: "Barangay Health Office",
    is_active: true,
  },
  {
    id: "e1000000-0000-4000-8000-000000000006",
    kind: "announcement",
    type: "general",
    severity: "info",
    alert_level: null,
    title: "Free first aid training — limited slots",
    body: "The Philippine Red Cross will run a basic first aid and CPR session at the barangay hall. Slots are limited to 40 participants. Sign up at the barangay office.",
    instruction: null,
    is_barangay_wide: true,
    published_at: daysAgo(5),
    expires_at: null,
    deactivated_at: null,
    area_names: [],
    issued_by_name: "Sangguniang Kabataan",
    is_active: true,
  },
  {
    id: "e1000000-0000-4000-8000-000000000007",
    kind: "alert",
    type: "heavy_rainfall",
    severity: "warning",
    alert_level: 1,
    title: "Alert Level 1 — Prepare to evacuate",
    body: "Continuous heavy rainfall has pushed the river past the Level 1 threshold. This is a preparation notice, not yet an evacuation order.",
    instruction:
      "Prepare your Go Bag and identification documents. Move valuables and appliances to higher ground. Keep this page open for updates.",
    is_barangay_wide: false,
    published_at: daysAgo(2),
    expires_at: null,
    deactivated_at: daysAgo(2),
    area_names: RIVERSIDE_AREAS,
    issued_by_name: "Barangay Disaster Risk Reduction and Management Committee",
    is_active: false,
  },
];

/** The alert that takes over the top of the page, or null when nothing is active. */
export const ACTIVE_ALERT: PublicAnnouncement | null =
  ANNOUNCEMENTS.find((a) => a.kind === "alert" && a.is_active) ?? null;
