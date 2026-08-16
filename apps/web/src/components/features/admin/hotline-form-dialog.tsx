"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Ambulance,
  Building2,
  Flame,
  LifeBuoy,
  Phone,
  Plus,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const hotlineTypes = [
  { value: "barangay", label: "Barangay / BHERT", icon: Building2 },
  { value: "mdrrmo", label: "MDRRMO / Disaster", icon: ShieldAlert },
  { value: "police", label: "Police (PNP)", icon: ShieldAlert },
  { value: "fire", label: "Fire Station (BFP)", icon: Flame },
  { value: "hospital", label: "Hospital / Clinic", icon: Stethoscope },
  { value: "ambulance", label: "Ambulance / Health", icon: Ambulance },
  { value: "rescue", label: "Emergency / Rescue", icon: LifeBuoy },
] as const;

export const hotlineTypeValues = [
  "barangay",
  "police",
  "fire",
  "ambulance",
  "hospital",
  "rescue",
  "mdrrmo",
] as const;

export const hotlineFormSchema = z.object({
  label: z.string().min(1, "Hotline name/label is required"),
  number: z.string().min(1, "Phone or mobile number is required"),
  type: z.enum(hotlineTypeValues),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type HotlineFormValues = z.infer<typeof hotlineFormSchema>;

export interface HotlineEntity extends HotlineFormValues {
  id: string;
}

interface HotlineFormDialogProps {
  hotline?: HotlineEntity | null;
  trigger?: React.ReactNode;
  onSubmit: (values: HotlineFormValues) => Promise<void>;
}

export function HotlineFormDialog({
  hotline,
  trigger,
  onSubmit,
}: HotlineFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEdit = Boolean(hotline);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HotlineFormValues>({
    resolver: zodResolver(hotlineFormSchema) as Resolver<HotlineFormValues>,
    defaultValues: hotline
      ? {
          label: hotline.label,
          number: hotline.number,
          type: hotline.type as (typeof hotlineTypeValues)[number],
          sort_order: hotline.sort_order ?? 0,
          is_active: hotline.is_active ?? true,
        }
      : {
          label: "",
          number: "",
          type: "barangay",
          sort_order: 0,
          is_active: true,
        },
  });

  const selectedType = watch("type");
  const isActive = watch("is_active");

  React.useEffect(() => {
    if (open) {
      reset(
        hotline
          ? {
              label: hotline.label,
              number: hotline.number,
              type: hotline.type as (typeof hotlineTypeValues)[number],
              sort_order: hotline.sort_order ?? 0,
              is_active: hotline.is_active ?? true,
            }
          : {
              label: "",
              number: "",
              type: "barangay",
              sort_order: 0,
              is_active: true,
            },
      );
    }
  }, [open, hotline, reset]);

  const handleFormSubmit = async (data: HotlineFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      setOpen(false);
    } catch {
      // Handled in caller via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            className="h-10 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md shadow-emerald-900/15 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.98] transition-all px-4 gap-2 border border-emerald-600/30 max-sm:w-full max-sm:justify-center cursor-pointer"
          >
            <Plus aria-hidden className="size-4 stroke-[2.5]" />
            <span>Add hotline</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="border-b border-neutral-100 bg-neutral-50/70 p-5 sm:p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-100/80 text-emerald-800 border border-emerald-200/80">
              <Phone className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-neutral-900">
                {isEdit ? "Edit Emergency Hotline" : "Add Emergency Hotline"}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 mt-0.5">
                {isEdit
                  ? "Update phone numbers, department classifications, or visibility."
                  : "Register a new callable line to the Barangay San Jose emergency directory."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5 sm:p-6 space-y-4.5">
          {/* Label / Service Name */}
          <div className="space-y-1.5">
            <Label htmlFor="hotline-label" className="text-xs font-bold text-neutral-800">
              Hotline Label / Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="hotline-label"
              {...register("label")}
              placeholder="e.g. Barangay San Jose - Emergency Hotline"
              className={cn(
                "h-10 text-sm font-medium",
                errors.label && "border-rose-400 focus-visible:ring-rose-200",
              )}
            />
            {errors.label && (
              <p className="text-[11px] font-semibold text-rose-600">
                {errors.label.message}
              </p>
            )}
          </div>

          {/* Phone / Mobile Number */}
          <div className="space-y-1.5">
            <Label htmlFor="hotline-number" className="text-xs font-bold text-neutral-800">
              Phone / Mobile Number <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="hotline-number"
              {...register("number")}
              placeholder="e.g. 0951-188-7878 or (02) 8256-3000 / 0920 432 7079"
              className={cn(
                "h-10 text-sm font-medium font-mono",
                errors.number && "border-rose-400 focus-visible:ring-rose-200",
              )}
            />
            {errors.number && (
              <p className="text-[11px] font-semibold text-rose-600">
                {errors.number.message}
              </p>
            )}
            <p className="text-[11.5px] text-neutral-500">
              Use <span className="font-mono text-neutral-700">/</span> to separate multiple numbers for the same line.
            </p>
          </div>

          {/* Department / Category Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-neutral-800">
              Department Classification <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {hotlineTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setValue("type", t.value as (typeof hotlineTypeValues)[number], { shouldValidate: true })}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all text-xs font-medium cursor-pointer",
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-600"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/70",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isSelected ? "text-emerald-700" : "text-neutral-500",
                      )}
                    />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Order & Active Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="sort_order" className="text-xs font-bold text-neutral-800">
                Directory Sort Order
              </Label>
              <Input
                id="sort_order"
                type="number"
                {...register("sort_order", { valueAsNumber: true })}
                className="h-10 text-sm font-semibold"
                placeholder="0"
              />
              <p className="text-[11px] text-neutral-500">
                Lower numbers appear first on the public directory.
              </p>
            </div>

            <div className="space-y-1.5 flex flex-col justify-between">
              <Label className="text-xs font-bold text-neutral-800">
                Directory Visibility
              </Label>
              <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="size-4.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-neutral-900">
                    {isActive ? "Active & Public" : "Inactive (Hidden)"}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {isActive ? "Visible across public portal" : "Hidden from directory"}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-100 bg-neutral-50/40 p-4 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs px-5"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Hotline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
