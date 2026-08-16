"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
type Plan = {
  meeting_point: string | null;
  out_of_area_contact: string | null;
  notes: string | null;
};
export default function PortalFamilyPlanPage() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["me", "family-plan"],
    queryFn: () => api.get<Plan>("/me/family-emergency-plan").then((r) => r.data),
  });
  const form = useForm<Plan>({
    defaultValues: { meeting_point: "", out_of_area_contact: "", notes: "" },
  });
  useEffect(() => {
    if (q.data) form.reset(q.data);
  }, [q.data, form]);
  const save = useMutation({
    mutationFn: (values: Plan) => api.put("/me/family-emergency-plan", values),
    onSuccess: () => client.invalidateQueries({ queryKey: ["me", "family-plan"] }),
  });
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
        Before an emergency
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Family emergency plan</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Write down the details your household should agree on before an evacuation.
      </p>
      <form
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="mt-7 space-y-5 border-y border-neutral-200 py-6"
      >
        <div>
          <Label htmlFor="meeting">Meeting point</Label>
          <Input
            id="meeting"
            className="mt-2"
            placeholder="e.g. Barangay hall covered court"
            {...form.register("meeting_point")}
          />
        </div>
        <div>
          <Label htmlFor="contact">Out-of-area contact</Label>
          <Input
            id="contact"
            className="mt-2"
            placeholder="Name and phone number"
            {...form.register("out_of_area_contact")}
          />
        </div>
        <div>
          <Label htmlFor="notes">Household notes</Label>
          <Textarea
            id="notes"
            rows={6}
            className="mt-2"
            placeholder="Medication, mobility needs, pet arrangements, or anything your household should remember."
            {...form.register("notes")}
          />
        </div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save family plan"}
        </Button>
      </form>
    </div>
  );
}
