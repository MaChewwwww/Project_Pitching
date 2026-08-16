"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HeartHandshake,
  Loader2,
  Plus,
  Save,
  UserCheck,
  UserPlus,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, toDisplayError } from "@/lib/api/client";
import type { MemberOut, MemberUpdate } from "@/lib/api/registry-types";

const RELATIONSHIPS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Grandparent",
  "Grandchild",
  "Others",
];

interface HouseholdMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: MemberOut | null;
}

export function HouseholdMemberDialog({
  open,
  onOpenChange,
  member,
}: HouseholdMemberDialogProps) {
  const isEditing = Boolean(member);
  const client = useQueryClient();

  const [fullName, setFullName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [sex, setSex] = React.useState<"male" | "female" | "">("");
  const [contactNumber, setContactNumber] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [isPwd, setIsPwd] = React.useState(false);
  const [isPregnant, setIsPregnant] = React.useState(false);
  const [isLactating, setIsLactating] = React.useState(false);
  const [hasChronicCondition, setHasChronicCondition] = React.useState(false);
  const [chronicConditionNote, setChronicConditionNote] = React.useState("");
  const [isBedridden, setIsBedridden] = React.useState(false);

  // Sync state whenever member changes or dialog opens
  React.useEffect(() => {
    if (open) {
      if (member) {
        setFullName(member.full_name || "");
        setBirthDate(member.birth_date || "");
        setSex(member.sex === "female" || member.sex === "male" ? member.sex : "");
        setContactNumber(member.contact_number || "");
        setRelationship(member.relationship_to_head || "");
        setIsPwd(Boolean(member.is_pwd));
        setIsPregnant(Boolean(member.is_pregnant));
        setIsLactating(Boolean(member.is_lactating));
        setHasChronicCondition(Boolean(member.has_chronic_condition));
        setChronicConditionNote(member.chronic_condition_note || "");
        setIsBedridden(Boolean(member.is_bedridden));
      } else {
        setFullName("");
        setBirthDate("");
        setSex("");
        setContactNumber("");
        setRelationship("");
        setIsPwd(false);
        setIsPregnant(false);
        setIsLactating(false);
        setHasChronicCondition(false);
        setChronicConditionNote("");
        setIsBedridden(false);
      }
    }
  }, [open, member]);

  const createMutation = useMutation({
    mutationFn: (payload: MemberUpdate) =>
      api.post("/me/household/members", payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["me", "household"] });
      toast.success("Household member registered successfully");
      onOpenChange(false);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: MemberUpdate) =>
      api.patch(`/me/household/members/${member?.id}`, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["me", "household"] });
      toast.success("Household member profile updated");
      onOpenChange(false);
    },
    onError: (error) => toast.error(toDisplayError(error).detail),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter the full name");
      return;
    }
    if (!birthDate) {
      toast.error("Please provide the birth date");
      return;
    }
    if (!sex) {
      toast.error("Please select biological sex");
      return;
    }
    if (!member?.is_head && !relationship) {
      toast.error("Please select relationship to household head");
      return;
    }
    if (hasChronicCondition && !chronicConditionNote.trim()) {
      toast.error("Please specify the chronic health condition");
      return;
    }

    const payload: MemberUpdate = {
      full_name: fullName.trim(),
      birth_date: birthDate,
      sex: sex as "male" | "female",
      contact_number: contactNumber.trim() || null,
      relationship_to_head: member?.is_head ? null : relationship,
      is_pwd: isPwd,
      is_pregnant: isPregnant,
      is_lactating: isLactating,
      has_chronic_condition: hasChronicCondition,
      chronic_condition_note: hasChronicCondition ? chronicConditionNote.trim() : null,
      is_bedridden: isBedridden,
      is_child: false,
      is_senior: false,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border border-neutral-200 bg-white p-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
              {isEditing ? (
                <UserCheck className="size-5" />
              ) : (
                <UserPlus className="size-5" />
              )}
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-neutral-900">
                {isEditing ? `Edit Profile: ${member?.full_name}` : "Add Household Member"}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                {isEditing
                  ? "Update birth date, relationship, or special vulnerability care flags."
                  : "Register a family member to your official household roster."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[min(70vh,560px)] space-y-6 overflow-y-auto p-6">
            {/* Section 1: Member Profile */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-bold text-neutral-900">
                <UserRound className="size-3.5 text-emerald-700" />
                <span>Personal Information</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="full_name" className="text-xs font-bold text-neutral-800">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    disabled={member?.is_head}
                    className="h-10 rounded-xl border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                  {member?.is_head ? (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Household Head name is synchronized with your login account.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="birth_date" className="text-xs font-bold text-neutral-800">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-10 rounded-xl border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-neutral-800">
                    Sex <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={sex}
                    onValueChange={(val) => setSex(val as "male" | "female")}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                      <SelectValue placeholder="Select Sex" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl">
                      <SelectItem value="female" showCheckmark>
                        Female
                      </SelectItem>
                      <SelectItem value="male" showCheckmark>
                        Male
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-800">
                    Contact Phone <span className="text-neutral-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="contact_number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="09XX XXX XXXX"
                    className="h-10 rounded-xl border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-neutral-800">
                    Relationship to Head <span className="text-red-500">*</span>
                  </Label>
                  {member?.is_head ? (
                    <div className="flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 text-xs font-bold text-emerald-900">
                      Household Head
                    </div>
                  ) : (
                    <Select
                      value={relationship}
                      onValueChange={(val) => setRelationship(val)}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-500/20">
                        <SelectValue placeholder="Select Relationship" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-neutral-200 bg-white shadow-xl">
                        {RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel} value={rel} showCheckmark>
                            {rel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Special Support & Care Needs */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-bold text-neutral-900">
                <HeartHandshake className="size-3.5 text-emerald-700" />
                <span>Vulnerability & Emergency Support Needs</span>
              </div>
              <p className="text-[11.5px] text-neutral-500">
                Check all flags that apply to help Barangay San Jose prioritize rescue, medicine, and nutrition support.
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3 text-xs font-bold text-neutral-800 transition-colors hover:bg-emerald-50/60 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={isPwd}
                    onChange={(e) => setIsPwd(e.target.checked)}
                    className="size-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Person with Disability (PWD)</span>
                </label>

                <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3 text-xs font-bold text-neutral-800 transition-colors hover:bg-emerald-50/60 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                    className="size-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pregnant</span>
                </label>

                <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3 text-xs font-bold text-neutral-800 transition-colors hover:bg-emerald-50/60 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={isLactating}
                    onChange={(e) => setIsLactating(e.target.checked)}
                    className="size-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Lactating Mother</span>
                </label>

                <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3 text-xs font-bold text-neutral-800 transition-colors hover:bg-emerald-50/60 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={isBedridden}
                    onChange={(e) => setIsBedridden(e.target.checked)}
                    className="size-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Bedridden / Mobility-Limited</span>
                </label>

                <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3 text-xs font-bold text-neutral-800 transition-colors hover:bg-emerald-50/60 hover:border-emerald-300 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={hasChronicCondition}
                    onChange={(e) => setHasChronicCondition(e.target.checked)}
                    className="size-4 rounded border-neutral-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Has Chronic Medical Condition (e.g. Asthma, Hypertension, Diabetes)</span>
                </label>
              </div>

              {hasChronicCondition ? (
                <div className="space-y-1 animate-in fade-in-50 duration-200 pt-1">
                  <Label htmlFor="chronic_note" className="text-xs font-bold text-neutral-800">
                    Chronic Condition Details <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="chronic_note"
                    value={chronicConditionNote}
                    onChange={(e) => setChronicConditionNote(e.target.value)}
                    placeholder="Specify condition, required daily medication, or oxygen support needs..."
                    className="rounded-xl border-neutral-200 focus:border-emerald-500 focus:ring-emerald-500/20 text-xs min-h-[70px]"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-full border-neutral-300 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 cursor-pointer gap-2 rounded-full border border-emerald-600/30 bg-emerald-700 px-5 text-xs font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-emerald-800 active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <>
                  <Save className="size-3.5" />
                  <span>Save Profile Changes</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Save & Add Member</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
