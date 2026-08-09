"use client";

import * as React from "react";
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldValues,
} from "react-hook-form";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const emptyMemberValues = {
  full_name: "",
  birth_date: "",
  sex: undefined as "male" | "female" | undefined,
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
  ["has_chronic_condition", "Chronic condition"],
  ["is_bedridden", "Bedridden / mobility-limited"],
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
}: {
  control: Control<TFieldValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "members" as never,
  });
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      <Label>Other household members</Label>

      {fields.map((field, i) => (
        <Collapsible
          key={field.id}
          open={openIndex === i}
          onOpenChange={(open) => setOpenIndex(open ? i : null)}
          className="rounded-lg border border-neutral-200"
        >
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left",
              "hover:bg-neutral-50",
            )}
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
          </CollapsibleTrigger>

          <CollapsibleContent className="flex flex-col gap-4 border-t border-neutral-200 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`members.${i}.full_name`}>Full name</Label>
              <Controller
                control={control}
                name={`members.${i}.full_name` as never}
                render={({ field: f }) => (
                  <Input id={`members.${i}.full_name`} {...f} value={f.value ?? ""} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`members.${i}.birth_date`}>Birth date</Label>
                <Controller
                  control={control}
                  name={`members.${i}.birth_date` as never}
                  render={({ field: f }) => (
                    <Input
                      id={`members.${i}.birth_date`}
                      type="date"
                      {...f}
                      value={f.value ?? ""}
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`members.${i}.relationship_to_head`}>
                  Relationship to head
                </Label>
                <Controller
                  control={control}
                  name={`members.${i}.relationship_to_head` as never}
                  render={({ field: f }) => (
                    <Input
                      id={`members.${i}.relationship_to_head`}
                      placeholder="e.g. Child, Spouse"
                      {...f}
                      value={f.value ?? ""}
                    />
                  )}
                />
              </div>
            </div>

            <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
              <legend className="text-caption mb-1 w-full text-neutral-500">
                Vulnerability flags — tick what&apos;s known; exact birth date is not
                required
              </legend>
              {VULNERABILITY_FLAGS.map(([name, label]) => (
                <div key={name} className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`members.${i}.${name}` as never}
                    render={({ field: f }) => (
                      <Checkbox
                        id={`members.${i}.${name}`}
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

            <Button
              type="button"
              variant="danger"
              size="sm"
              className="self-start"
              onClick={() => {
                remove(i);
                setOpenIndex(null);
              }}
            >
              <Trash2 aria-hidden className="size-3.5" />
              Remove member
            </Button>
          </CollapsibleContent>
        </Collapsible>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="sticky bottom-0 self-start bg-white"
        onClick={() => {
          append(emptyMemberValues as never);
          setOpenIndex(fields.length);
        }}
      >
        <Plus aria-hidden className="size-4" />
        Add member
      </Button>
    </div>
  );
}
