"use client";

import * as React from "react";
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldValues,
} from "react-hook-form";
import { ChevronDown, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const memberCheckboxClassName =
  "border-emerald-300 data-checked:border-emerald-600 data-checked:bg-emerald-600 data-checked:text-white focus-visible:ring-emerald-500/30";

export const emptyMemberValues = {
  full_name: "",
  birth_date: "",
  sex: undefined as "male" | "female" | undefined,
  contact_number: "",
  relationship_to_head: "",
  is_child: false,
  is_senior: false,
  is_pwd: false,
  is_pregnant: false,
  is_lactating: false,
  has_chronic_condition: false,
  chronic_condition_note: "",
  is_bedridden: false,
};

const VULNERABILITY_FLAGS = [
  ["is_child", "Child"],
  ["is_senior", "Senior"],
  ["is_pwd", "PWD"],
  ["is_pregnant", "Pregnant"],
  ["is_lactating", "Lactating"],
  ["has_chronic_condition", "Chronic Condition"],
  ["is_bedridden", "Bedridden / Mobility-Limited"],
] as const;

const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Grandparent",
  "Grandchild",
  "Others",
] as const;

/**
 * The "member repeater" `design.md` line 638 specifies for BHW-assisted
 * registration (FR-REG-024/025): one collapsible card per member, one open at
 * a time, "Member N of M" progress, sticky add/remove. Everyone but the head —
 * the head's own profile is a fixed section on the parent form, not part of
 * this array (mirrors the self-registration onboarding split).
 *
 * Generic over the parent form's field values (`as never` casts below follow
 * the same escape hatch `AdminForm` already uses for this exact RHF+Zod
 * generic-variance situation).
 */
export function HouseholdMemberRepeater<TFieldValues extends FieldValues>({
  control,
  onArchiveExisting,
}: {
  control: Control<TFieldValues>;
  onArchiveExisting?: (memberId: string) => Promise<void>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "members" as never,
  });
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Users aria-hidden className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-neutral-950">Household Members</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Add every member available during this visit. You can add more than one.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start sm:self-center"
          onClick={() => {
            append(emptyMemberValues as never);
            setOpenIndex(fields.length);
          }}
        >
          <Plus aria-hidden className="size-4" />
          Add member
        </Button>
      </div>

      {fields.map((field, i) => (
        <Collapsible
          key={field.id}
          open={openIndex === i}
          onOpenChange={(open) => setOpenIndex(open ? i : null)}
          className="rounded-lg border border-emerald-200/80 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 hover:bg-neutral-50">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="text-body-sm font-semibold text-neutral-800">
                  Member {i + 1} of {fields.length}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-4 text-neutral-500 transition-transform",
                    openIndex === i && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>

            {!(field as { record_id?: string }).record_id || onArchiveExisting ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const recordId = (field as { record_id?: string }).record_id;
                  if (recordId && onArchiveExisting) {
                    if (
                      !window.confirm(
                        "Archive this citizen? Their historical records will be retained.",
                      )
                    )
                      return;
                    void onArchiveExisting(recordId).then(() => {
                      remove(i);
                      setOpenIndex(null);
                    });
                    return;
                  }
                  remove(i);
                  setOpenIndex(null);
                }}
              >
                <Trash2 aria-hidden className="size-3.5" />
                Remove member
              </Button>
            ) : null}
          </div>

          <CollapsibleContent className="flex flex-col gap-4 border-t border-emerald-100 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`members.${i}.full_name`}>
                Full Name <span className="text-red-600">*</span>
              </Label>
              <Controller
                control={control}
                name={`members.${i}.full_name` as never}
                render={({ field: f, fieldState }) => (
                  <>
                    <Input
                      id={`members.${i}.full_name`}
                      aria-invalid={!!fieldState.error}
                      className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      {...f}
                      value={f.value ?? ""}
                    />
                    {fieldState.error ? (
                      <p className="text-danger text-xs">{fieldState.error.message}</p>
                    ) : null}
                  </>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`members.${i}.birth_date`}>
                  Birth Date <span className="text-red-600">*</span>
                </Label>
                <Controller
                  control={control}
                  name={`members.${i}.birth_date` as never}
                  render={({ field: f, fieldState }) => (
                    <>
                      <Input
                        id={`members.${i}.birth_date`}
                        type="date"
                        aria-invalid={!!fieldState.error}
                        className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                        {...f}
                        value={f.value ?? ""}
                      />
                      {fieldState.error ? (
                        <p className="text-danger text-xs">{fieldState.error.message}</p>
                      ) : null}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`members.${i}.sex`}>
                  Sex <span className="text-red-600">*</span>
                </Label>
                <Controller
                  control={control}
                  name={`members.${i}.sex` as never}
                  render={({ field: f, fieldState }) => (
                    <>
                      <Select value={f.value ?? ""} onValueChange={f.onChange}>
                        <SelectTrigger
                          id={`members.${i}.sex`}
                          aria-invalid={!!fieldState.error}
                          className="h-10 w-full rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error ? (
                        <p className="text-danger text-xs">{fieldState.error.message}</p>
                      ) : null}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`members.${i}.contact_number`}>
                  Contact Number{" "}
                  <span className="font-normal text-neutral-400">(Optional)</span>
                </Label>
                <Controller
                  control={control}
                  name={`members.${i}.contact_number` as never}
                  render={({ field: f }) => (
                    <Input
                      id={`members.${i}.contact_number`}
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      className="h-10 rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      {...f}
                      value={f.value ?? ""}
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`members.${i}.relationship_to_head`}>
                  Relationship to Head <span className="text-red-600">*</span>
                </Label>
                <Controller
                  control={control}
                  name={`members.${i}.relationship_to_head` as never}
                  render={({ field: f, fieldState }) => (
                    <>
                      <Select value={f.value ?? ""} onValueChange={f.onChange}>
                        <SelectTrigger
                          id={`members.${i}.relationship_to_head`}
                          aria-invalid={!!fieldState.error}
                          className="h-10 w-full rounded-lg border-emerald-200/80 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <SelectValue placeholder="Select Relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_OPTIONS.map((relationship) => (
                            <SelectItem key={relationship} value={relationship}>
                              {relationship}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error ? (
                        <p className="text-danger text-xs">{fieldState.error.message}</p>
                      ) : null}
                    </>
                  )}
                />
              </div>
            </div>

            <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
              <legend className="text-caption mb-1 w-full text-neutral-500">
                Vulnerability Flags — Tick What&apos;s Known
              </legend>
              {VULNERABILITY_FLAGS.map(([name, label]) => (
                <div key={name} className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`members.${i}.${name}` as never}
                    render={({ field: f }) => (
                      <Checkbox
                        id={`members.${i}.${name}`}
                        className={memberCheckboxClassName}
                        checked={!!f.value}
                        onCheckedChange={f.onChange}
                      />
                    )}
                  />
                  <Label htmlFor={`members.${i}.${name}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </fieldset>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
