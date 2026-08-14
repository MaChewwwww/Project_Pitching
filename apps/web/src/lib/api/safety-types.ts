/**
 * Types for the safety module's `/me` and `/admin` endpoints
 * (`apps/api/src/modules/safety/schemas.py`, plus the `EmergencyEvent`
 * lifecycle which lives in `evacuation/schemas.py` on the backend since it
 * owns that model). Not part of `public-types.ts` — these carry PII or
 * barangay-staff-only information and are never used by a server-rendered
 * public page.
 */

import type {
  EmergencyEventType,
  GeoJsonPoint,
  PublicEmergencyEvent,
} from "./public-types";

export interface EmergencyEventDeclare {
  name: string;
  type: EmergencyEventType;
  started_at?: string | null;
  /** Closing a live event is a side effect big enough to require an explicit
   * opt-in — omitting this when one is already active gets a 409, not a
   * silent auto-close. */
}

export interface EmergencyEventOut {
  id: string;
  name: string;
  type: EmergencyEventType;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  declared_by_user_id: string | null;
  declared_by_name: string | null;
  occupancy_reset_count: number;
}

/* --- safety check-in (FR-SAF-001…007, 011, 013) --------------------------- */

export type SafetyStatusValue = "safe" | "needs_rescue" | "unaccounted";
export type SetMethod = "self" | "assisted" | "household_bulk";

export interface SafetyStatusSelfIn {
  event_id?: string | null;
  evac_center_id?: string | null;
  status: SafetyStatusValue;
  scope: "member" | "household";
  /** Required when `scope === "member"`. */
  member_ids?: string[];
  /** Required when `scope === "household"` — the server rejects this unless
   * it matches the household's live roster exactly (FR-SAF-003). */
  acknowledged_member_ids?: string[];
}

export interface SafetyStatusAdminIn {
  event_id?: string | null;
  evac_center_id?: string | null;
  status: SafetyStatusValue;
  scope: "member" | "household" | "unregistered";
  household_id?: string | null;
  member_ids?: string[];
  acknowledged_member_ids?: string[];
  unregistered_person_id?: string | null;
}

export interface MemberSafetyOut {
  member_id: string;
  full_name: string;
  is_head: boolean;
  status: SafetyStatusValue;
  set_method: SetMethod | null;
  set_at: string | null;
  set_by_name: string | null;
  /** Raw flag names (e.g. "is_bedridden") — not a computed vulnerability
   * level, which is blocked on BRD OI-18. */
  vulnerability_flags: string[];
}

export interface HouseholdSafetyOut {
  event: PublicEmergencyEvent;
  household_id: string;
  reference_no: string;
  members: MemberSafetyOut[];
}

export interface MySafetyOut {
  /** null → no active emergency, an empty state rather than an error. */
  event: PublicEmergencyEvent | null;
  household: HouseholdSafetyOut | null;
}

export interface AreaAccountedFor {
  area_id: string | null;
  area_name: string;
  registered_members: number;
  /** FR-SAF-005: individually confirmed vs. swept in by a household bulk
   * action — kept as separate counts, never combined. */
  safe_confirmed: number;
  safe_bulk: number;
  needs_rescue: number;
  unaccounted: number;
}

export interface AccountedForOut {
  event: PublicEmergencyEvent;
  computed_at: string;
  registered: AreaAccountedFor[];
  registered_total: AreaAccountedFor;
  /** FR-SAF-013: unregistered counts, always separate from `registered*`. */
  unregistered_safe: number;
  unregistered_needs_rescue: number;
}

/* --- public rescue request (FR-SAF-008/009/017) ---------------------------- */

export interface RescueRequestPublicIn {
  requester_name: string;
  contact_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_note?: string | null;
  description: string;
  people_count?: number | null;
}

/** No `status` field, deliberately — FR-SAF-017 forbids anything that reads
 * as "queued for rescue". */
export interface RescueRequestAck {
  id: string;
  received_at: string;
}

/* --- rescue queue + triage (FR-SAF-010) ------------------------------------ */

export type RescueRequestStatus =
  "pending" | "verified" | "dispatched" | "resolved" | "dismissed";

export interface RescueRequestOut {
  id: string;
  created_at: string;
  requester_name: string;
  contact_number: string | null;
  location: GeoJsonPoint | null;
  location_note: string | null;
  description: string;
  people_count: number | null;
  status: RescueRequestStatus;
  priority: number | null;
  priority_factors: string[];
  priority_is_manual: boolean;
  is_registered: boolean;
  household_reference_no: string | null;
  area_name: string | null;
  /** Always null — a snapshot of a vulnerability level BRD OI-18 has not
   * defined yet. See the FR-SAF-010 deviation note in frs_nfrs.md. */
  vulnerability_level: null;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface RescueRequestPatch {
  status?: RescueRequestStatus;
  assigned_to_user_id?: string | null;
  /** Required by the server in the same request that sets `status` to
   * `resolved` or `dismissed` — a 422 otherwise. */
  resolution_note?: string | null;
  priority?: number;
}

/* --- unregistered persons (FR-SAF-012/013) ---------------------------------- */

export interface UnregisteredPersonIn {
  event_id?: string | null;
  evac_center_id?: string | null;
  full_name: string;
  contact_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_note?: string | null;
  initial_status: "safe" | "needs_rescue";
  is_child?: boolean;
  is_senior?: boolean;
  is_pwd?: boolean;
  is_pregnant?: boolean;
  is_lactating?: boolean;
  has_chronic_condition?: boolean;
  chronic_condition_note?: string | null;
  is_bedridden?: boolean;
}

export interface UnregisteredPersonPatch {
  full_name?: string;
  contact_number?: string | null;
  latitude?: number;
  longitude?: number;
  location_note?: string | null;
}

export interface UnregisteredPersonOut {
  id: string;
  event_id: string;
  created_at: string;
  full_name: string;
  contact_number: string | null;
  location: GeoJsonPoint | null;
  location_note: string | null;
  status: SafetyStatusValue;
  recorded_by_name: string | null;
  converted_household_id: string | null;
  converted_member_id: string | null;
  is_child: boolean;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  is_lactating: boolean;
  has_chronic_condition: boolean;
  chronic_condition_note: string | null;
  is_bedridden: boolean;
  evac_center_id: string | null;
  evac_center_name: string | null;
}

export interface WorkspaceMemberOut {
  member_id: string;
  full_name: string;
  is_head: boolean;
  status: SafetyStatusValue;
  set_method: SetMethod | null;
  vulnerability_flags: string[];
  evac_center_id: string | null;
  evac_center_name: string | null;
}

export interface WorkspaceHouseholdOut {
  household_id: string;
  reference_no: string;
  head_name: string;
  area_id: string;
  area_name: string;
  street_address: string | null;
  location: GeoJsonPoint | null;
  waterway_proximity: "very_near" | "near" | "far" | null;
  members: WorkspaceMemberOut[];
  safe_count: number;
  needs_rescue_count: number;
  unaccounted_count: number;
  all_safe: boolean;
}

export interface EmergencyWorkspaceOut {
  event: PublicEmergencyEvent;
  is_read_only: boolean;
  households: WorkspaceHouseholdOut[];
  unregistered_pins: Array<{
    id: string;
    full_name: string;
    location: GeoJsonPoint;
    status: SafetyStatusValue;
    vulnerability_flags: string[];
    evac_center_id: string | null;
    evac_center_name: string | null;
  }>;
  unmapped_household_count: number;
  evacuation_centers: import("./public-types").PublicEvacCenter[];
}

/* --- incident reports (FR-SAF-015/016) -------------------------------------- */

export type IncidentType =
  | "flooding"
  | "fire"
  | "fallen_tree"
  | "road_blockage"
  | "landslide"
  | "power_outage"
  | "other";

export type IncidentStatus = "pending" | "verified" | "dismissed";

export interface IncidentReportOut {
  id: string;
  created_at: string;
  type: IncidentType;
  description: string;
  location: GeoJsonPoint | null;
  location_note: string | null;
  /** Already prefixed "/uploads/" — use directly as an <img src>. */
  photo_url: string | null;
  status: IncidentStatus;
  reported_by_name: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
  dismissal_reason: string | null;
}

/** Required by the server in the same request that dismisses a report — a
 * 422 otherwise. */
export interface IncidentReportReview {
  status: "verified" | "dismissed";
  dismissal_reason?: string | null;
}
