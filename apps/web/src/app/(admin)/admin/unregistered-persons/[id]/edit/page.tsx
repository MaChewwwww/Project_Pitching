"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, toDisplayError } from "@/lib/api/client";
import { useRequireRole } from "@/lib/auth/use-require-role";
import type { UnregisteredPersonOut } from "@/lib/api/safety-types";

function EditForm({ person }: { person: UnregisteredPersonOut }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = React.useState(person.full_name || "");
  const [contactNumber, setContactNumber] = React.useState(person.contact_number || "");
  const [locationNote, setLocationNote] = React.useState(person.location_note || "");
  const [isInfant, setIsInfant] = React.useState(false);
  const [isChild, setIsChild] = React.useState(person.is_child || false);
  const [isSenior, setIsSenior] = React.useState(person.is_senior || false);
  const [isPwd, setIsPwd] = React.useState(person.is_pwd || false);
  const [isPregnant, setIsPregnant] = React.useState(person.is_pregnant || false);
  const [isLactating, setIsLactating] = React.useState(person.is_lactating || false);
  const [hasChronicCondition, setHasChronicCondition] = React.useState(
    person.has_chronic_condition || false,
  );
  const [chronicNote, setChronicNote] = React.useState(
    person.chronic_condition_note || "",
  );
  const [isBedridden, setIsBedridden] = React.useState(person.is_bedridden || false);

  const mutation = useMutation({
    mutationFn: async () => {
      return api.patch<UnregisteredPersonOut>(`/admin/unregistered-persons/${person.id}`, {
        full_name: fullName.trim(),
        contact_number: contactNumber.trim() || null,
        location_note: locationNote.trim() || null,
        is_child: isChild || isInfant,
        is_senior: isSenior,
        is_pwd: isPwd,
        is_pregnant: isPregnant,
        is_lactating: isLactating,
        has_chronic_condition: hasChronicCondition,
        chronic_condition_note: chronicNote.trim() || null,
        is_bedridden: isBedridden,
      });
    },
    onSuccess: () => {
      toast.success("Walk-in person details updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "unregistered-persons"] });
      router.push(`/admin/unregistered-persons/${person.id}` as Route);
    },
    onError: (err) => {
      toast.error(toDisplayError(err).detail || "Failed to update walk-in person");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-neutral-200 shadow-xs">
        <CardHeader className="border-b border-neutral-100 pb-4">
          <CardTitle className="text-lg font-black text-neutral-900">
            Edit Walk-In Person Details
          </CardTitle>
          <p className="text-xs text-neutral-500 mt-0.5">
            Update name, contact information, location address, and support needs.
          </p>
        </CardHeader>

        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name" className="text-xs font-bold text-neutral-800">
              Full Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_number" className="text-xs font-bold text-neutral-800">
              Contact Number (Optional)
            </Label>
            <Input
              id="contact_number"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location_note" className="text-xs font-bold text-neutral-800">
              Location Address (Optional)
            </Label>
            <Input
              id="location_note"
              placeholder="e.g. Block 3 Area 2 Riverside, Sitio San Jose"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          {/* Special Needs Checklist */}
          <fieldset className="rounded-xl border border-neutral-200 bg-slate-50/50 p-4 mt-2">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-neutral-800">
              Special Needs & Demographics
            </legend>
            <div className="grid grid-cols-2 gap-3 text-xs font-medium text-neutral-800 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInfant}
                  onChange={(e) => setIsInfant(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Infant / Toddler (0–4 y/o)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChild}
                  onChange={(e) => setIsChild(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Minor (5–17 y/o)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSenior}
                  onChange={(e) => setIsSenior(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Senior Citizen (60+)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPwd}
                  onChange={(e) => setIsPwd(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                PWD
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPregnant}
                  onChange={(e) => setIsPregnant(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Pregnant
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLactating}
                  onChange={(e) => setIsLactating(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Lactating Mother
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasChronicCondition}
                  onChange={(e) => setHasChronicCondition(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Chronic Condition
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBedridden}
                  onChange={(e) => setIsBedridden(e.target.checked)}
                  className="accent-primary-700 size-4 rounded"
                />
                Bedridden / Mobility-limited
              </label>
            </div>

            <div className="mt-3.5">
              <Label htmlFor="chronic_note" className="text-xs font-bold text-neutral-800">
                Medical / Chronic Condition Note
              </Label>
              <Input
                id="chronic_note"
                placeholder="e.g. Daily hypertension medication, dialysis twice weekly..."
                value={chronicNote}
                onChange={(e) => setChronicNote(e.target.value)}
                className="h-9 mt-1 rounded-lg"
              />
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/unregistered-persons/${person.id}` as Route)}
              className="h-10 rounded-xl px-5 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-10 rounded-xl bg-emerald-700 px-6 font-bold text-white shadow-sm hover:bg-emerald-800 cursor-pointer"
            >
              <Save className="size-4 mr-1.5" />
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default function EditUnregisteredPersonPage() {
  useRequireRole("admin", "bhw");
  const params = useParams<{ id: string }>();
  const personId = params.id;

  const { data: person, isLoading } = useQuery({
    queryKey: ["admin", "unregistered-persons", personId],
    queryFn: () =>
      api
        .get<UnregisteredPersonOut>(`/admin/unregistered-persons/${personId}`)
        .then((res) => res.data),
    enabled: Boolean(personId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-xs font-bold text-neutral-600">Loading walk-in details...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-8 text-center text-xs font-bold text-neutral-600">
        Person not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Top Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium text-neutral-500">
        <Link
          href={`/admin/unregistered-persons/${personId}` as Route}
          className="hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" />
          Back to Profile
        </Link>
        <span>/</span>
        <span className="font-bold text-neutral-900">Edit Details</span>
      </nav>

      <EditForm person={person} />
    </div>
  );
}
