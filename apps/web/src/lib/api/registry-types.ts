/**
 * Types for the registry module's `/me` and `/admin` endpoints
 * (`apps/api/src/modules/registry/schemas.py`). Not part of `public-types.ts`
 * — these carry PII and are never used by a server-rendered public page.
 */

export interface MemberIn {
  full_name: string;
  birth_date: string | null;
  sex: "male" | "female" | null;
  contact_number: string | null;
  relationship_to_head: string | null;
  is_child: boolean;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  is_lactating: boolean;
  has_chronic_condition: boolean;
  chronic_condition_note: string | null;
  is_bedridden: boolean;
}

/** The self-registration head's own onboarding profile — no `full_name` or
 * `relationship_to_head` (see `HeadMemberIn` on the backend). */
export interface HeadMemberIn {
  birth_date: string | null;
  sex: "male" | "female" | null;
  is_pwd: boolean;
  is_pregnant: boolean;
  is_lactating: boolean;
  has_chronic_condition: boolean;
  chronic_condition_note: string | null;
  is_bedridden: boolean;
}

export interface HouseholdCreateSelf {
  street_address: string | null;
  waterway_proximity?: "very_near" | "near" | "far" | null;
  area_id: string;
  latitude: number | null;
  longitude: number | null;
  contact_number: string | null;
  is_unreachable_by_phone: boolean;
  head_member: HeadMemberIn;
}

export interface HouseholdCreateBhw {
  head_name: string;
  contact_number: string | null;
  area_id: string;
  street_address: string;
  waterway_proximity?: "very_near" | "near" | "far" | null;
  latitude: number;
  longitude: number;
  head_member: MemberIn;
  members: MemberIn[];
}

export interface MemberOut {
  id: string;
  full_name: string;
  birth_date: string | null;
  sex: string | null;
  contact_number: string | null;
  relationship_to_head: string | null;
  is_head: boolean;
  is_child: boolean;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  is_lactating: boolean;
  has_chronic_condition: boolean;
  chronic_condition_note: string | null;
  is_bedridden: boolean;
}

export interface HouseholdOut {
  id: string;
  reference_no: string;
  head_name: string;
  head_user_id: string | null;
  contact_number: string | null;
  is_unreachable_by_phone: boolean;
  area_id: string;
  area_name: string | null;
  street_address: string | null;
  waterway_proximity?: string | null;
  location: { type: "Point"; coordinates: [number, number] } | null;
  source: "self" | "bhw";
  verified_at: string | null;
  has_possible_duplicate: boolean;
  member_count: number;
  created_at: string;
}

export interface HouseholdDetailOut extends HouseholdOut {
  members: MemberOut[];
}

export interface RegistryMemberOut extends MemberOut {
  household_id: string;
  household_reference_no: string;
  household_head_name: string;
  household_head_user_id: string | null;
  area_id: string;
  area_name: string;
  created_at: string;
}

export interface RegistryMemberDetailOut extends RegistryMemberOut {
  household: HouseholdOut;
  updated_at: string;
}

export interface RegistryMemberSummary {
  citizens: number;
  household_heads: number;
  household_members: number;
  complete_profiles: number;
  no_contact_number: number;
  with_support_needs: number;
  age_groups: { children: number; adults: number; seniors: number };
  support: {
    pwd: number;
    maternal: number;
    chronic_condition: number;
    mobility_limited: number;
  };
  areas: Array<{ id: string; name: string; citizens: number }>;
}

export interface RegistryMemberActivityOut {
  safety: Array<{
    event_id: string;
    event_name: string;
    status: "safe" | "needs_rescue" | "unaccounted";
    set_method: string | null;
    set_at: string | null;
  }>;
  evacuations: HouseholdActivityItem[];
  household_rescues: HouseholdActivityItem[];
  household_reports: HouseholdActivityItem[];
}

export interface HouseholdUpdate {
  head_name?: string | null;
  contact_number: string | null;
  is_unreachable_by_phone: boolean;
  area_id: string;
  street_address: string | null;
  waterway_proximity?: "very_near" | "near" | "far" | null;
  latitude: number | null;
  longitude: number | null;
}

export interface WorkspaceMemberUpdate extends MemberUpdate {
  id?: string | null;
}

export interface HouseholdWorkspaceUpdate extends HouseholdUpdate {
  head_member: MemberUpdate;
  members: WorkspaceMemberUpdate[];
}

export interface HouseholdActivityItem {
  id: string;
  kind: "evacuation" | "rescue" | "incident";
  title: string;
  detail: string | null;
  status: string | null;
  occurred_at: string;
}

export interface HouseholdActivityOut {
  safety: Array<{
    event_id: string;
    event_name: string;
    safe: number;
    needs_rescue: number;
    unaccounted: number;
  }>;
  evacuations: HouseholdActivityItem[];
  rescues: HouseholdActivityItem[];
  incident_reports: HouseholdActivityItem[];
}

export interface MemberUpdate {
  full_name: string;
  birth_date: string | null;
  sex: "male" | "female" | null;
  contact_number: string | null;
  relationship_to_head: string | null;
  is_child: boolean;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  is_lactating: boolean;
  has_chronic_condition: boolean;
  chronic_condition_note: string | null;
  is_bedridden: boolean;
}

export interface RegistrySummary {
  households: number;
  citizens: number;
  average_household_size: number | null;
  unreachable_households: number;
  possible_duplicates: number;
  self_registered_households: number;
  bhw_assisted_households: number;
  areas: Array<{
    id: string;
    name: string;
    households: number;
    citizens: number;
  }>;
}

export interface DuplicateCandidate {
  household_id: string;
  reference_no: string;
  head_name: string;
  area_id: string;
  match_reason: "name_similarity" | "member_match";
}

export interface HouseholdCreateResponse {
  household: HouseholdOut;
  members: MemberOut[];
  duplicate_candidates: DuplicateCandidate[];
}

export interface HouseholdMergeRequest {
  kept_household_id: string;
  merged_household_id: string;
  notes?: string | null;
}
