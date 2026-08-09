import { CircleCheck, TriangleAlert, Users } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import type { AccountedForOut } from "@/lib/api/safety-types";

/**
 * FR-SAF-011 — live registered accounted-for vs. unaccounted, by area. The
 * unregistered block is deliberately separate (FR-SAF-013): there is no
 * shape here in which those counts blend into the registered coverage
 * figures a barangay reports on.
 */
export function AccountedForPanel({ data }: { data: AccountedForOut }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Confirmed safe"
          value={data.registered_total.safe_confirmed}
          icon={CircleCheck}
          tone="text-success"
        />
        <SummaryTile
          label="Safe (household)"
          value={data.registered_total.safe_bulk}
          icon={Users}
          tone="text-success"
        />
        <SummaryTile
          label="Needs rescue"
          value={data.registered_total.needs_rescue}
          icon={TriangleAlert}
          tone="text-danger"
        />
        <SummaryTile
          label="Unaccounted"
          value={data.registered_total.unaccounted}
          icon={TriangleAlert}
          tone="text-neutral-500"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="text-body-sm w-full min-w-[560px] text-left">
          <thead className="text-caption bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Area</th>
              <th className="px-3 py-2 font-semibold">Registered</th>
              <th className="px-3 py-2 font-semibold">Confirmed safe</th>
              <th className="px-3 py-2 font-semibold">Safe (household)</th>
              <th className="px-3 py-2 font-semibold">Needs rescue</th>
              <th className="px-3 py-2 font-semibold">Unaccounted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.registered.map((area) => (
              <tr key={area.area_id ?? area.area_name}>
                <td className="px-3 py-2 font-medium text-neutral-900">
                  {area.area_name}
                </td>
                <td className="px-3 py-2">{area.registered_members}</td>
                <td className="px-3 py-2">{area.safe_confirmed}</td>
                <td className="px-3 py-2">{area.safe_bulk}</td>
                <td className="text-danger px-3 py-2">{area.needs_rescue}</td>
                <td className="px-3 py-2 text-neutral-500">{area.unaccounted}</td>
              </tr>
            ))}
            {data.registered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  No households in scope for this event.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Card radius="lg">
        <CardContent className="flex flex-col gap-1">
          <span className="text-overline text-neutral-500">
            Unregistered persons — counted separately (FR-SAF-013)
          </span>
          <p className="text-body-sm text-neutral-700">
            {data.unregistered_safe} safe · {data.unregistered_needs_rescue} needing
            rescue
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CircleCheck;
  tone: string;
}) {
  return (
    <Card radius="lg">
      <CardContent className="flex flex-col gap-1 py-3">
        <Icon aria-hidden className={`size-4 ${tone}`} />
        <span className="text-h3 font-bold text-neutral-900">{value}</span>
        <span className="text-caption text-neutral-500">{label}</span>
      </CardContent>
    </Card>
  );
}
