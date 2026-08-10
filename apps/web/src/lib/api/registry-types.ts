/**
 * Types for the registry module's `/me` and `/admin` endpoints
 * (`apps/api/src/modules/registry/schemas.py`). Not part of `public-types.ts`
 * — these carry PII and are never used by a server-rendered public page.
 */

export interface MemberIn {
  full_name: string;
  birth_date: string | null;
  sex: "male" | "female" | null;
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
  is_unreachable_by_phone: boolean;
  area_id: string;
  street_address: string | null;
  latitude: number | null;
  longitude: number | null;
  head_member: MemberIn;
  members: MemberIn[];
}

export interface MemberOut {
  id: string;
  full_name: string;
  birth_date: string | null;
  sex: string | null;
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
