import { CheckCircle2, ShieldAlert, UserCheck, Users, AlertTriangle, HelpCircle } from "lucide-react";

import { Card, CardContent } from "@/components/common/card";
import { Badge } from "@/components/common/badge";
import type { AccountedForOut } from "@/lib/api/safety-types";

/**
 * FR-SAF-011 — live registered accounted-for vs. unaccounted, by area. The
 * unregistered block is deliberately separate (FR-SAF-013): there is no
 * shape here in which those counts blend into the registered coverage
 * figures a barangay reports on.
 */
export function AccountedForPanel({ data }: { data: AccountedForOut }) {
  const totalRegistered = data.registered_total.registered_members || 1;
  const safeTotal = data.registered_total.safe_confirmed + data.registered_total.safe_bulk;
  const safePct = ((safeTotal / totalRegistered) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-5">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Confirmed Safe"
          sublabel="Individually checked in"
          value={data.registered_total.safe_confirmed}
          icon={CheckCircle2}
          tone="emerald"
          badgeText="Verified"
        />
        <SummaryTile
          label="Safe (Household)"
          sublabel="Marked safe by Head"
          value={data.registered_total.safe_bulk}
          icon={UserCheck}
          tone="teal"
          badgeText="Self-Reported"
        />
        <SummaryTile
          label="Needs Rescue"
          sublabel="Immediate response"
          value={data.registered_total.needs_rescue}
          icon={ShieldAlert}
          tone="rose"
          badgeText={data.registered_total.needs_rescue > 0 ? "Priority 1" : "Clear"}
        />
        <SummaryTile
          label="Unaccounted"
          sublabel="Pending verification"
          value={data.registered_total.unaccounted}
          icon={HelpCircle}
          tone="amber"
          badgeText="Monitoring"
        />
      </div>

      {/* Area Breakdown Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Area Safety Ledger</h3>
            <p className="text-xs text-neutral-500">
              Live safety status breakdown across all barangay administrative areas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Total Registered Safety:</span>
            <Badge tone={Number(safePct) >= 80 ? "success" : Number(safePct) >= 50 ? "warning" : "danger"}>
              {safePct}% Safe
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#064e3b] text-white text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Area</th>
                <th className="px-4 py-3.5 text-center">Registered</th>
                <th className="px-4 py-3.5 text-center">Confirmed Safe</th>
                <th className="px-4 py-3.5 text-center">Safe (Household)</th>
                <th className="px-4 py-3.5 text-center">Needs Rescue</th>
                <th className="px-4 py-3.5 text-center">Unaccounted</th>
                <th className="px-5 py-3.5">Safety Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {data.registered.map((area) => {
                const areaReg = area.registered_members || 1;
                const safeCount = area.safe_confirmed + area.safe_bulk;
                const safeRatio = Math.min(100, Math.round((safeCount / areaReg) * 100));
                const rescueRatio = Math.min(100, Math.round((area.needs_rescue / areaReg) * 100));
                const unaccountedRatio = Math.max(0, 100 - safeRatio - rescueRatio);

                return (
                  <tr key={area.area_id ?? area.area_name} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-neutral-900">
                      {area.area_name}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-neutral-700">
                      {area.registered_members}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-emerald-600">
                      {area.safe_confirmed}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-teal-600">
                      {area.safe_bulk}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-rose-600">
                      {area.needs_rescue > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-700 border border-rose-200">
                          <AlertTriangle className="size-3 text-rose-600" />
                          {area.needs_rescue}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-neutral-500">
                      {area.unaccounted}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 w-36">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 flex">
                          <div
                            style={{ width: `${safeRatio}%` }}
                            className="bg-emerald-500 transition-all duration-500"
                            title={`Safe: ${safeRatio}%`}
                          />
                          <div
                            style={{ width: `${rescueRatio}%` }}
                            className="bg-rose-500 transition-all duration-500"
                            title={`Rescue: ${rescueRatio}%`}
                          />
                          <div
                            style={{ width: `${unaccountedRatio}%` }}
                            className="bg-amber-400/80 transition-all duration-500"
                            title={`Unaccounted: ${unaccountedRatio}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                          <span className="text-emerald-700 font-semibold">{safeRatio}% safe</span>
                          {area.needs_rescue > 0 && (
                            <span className="text-rose-600 font-bold">{area.needs_rescue} rescue</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.registered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-neutral-500">
                    No households in scope for this event.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* FR-SAF-013 Unregistered Persons Separate Ledger */}
      <Card radius="lg" className="border-amber-200/80 bg-amber-50/40">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Users className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Unregistered Persons Ledger (FR-SAF-013)
                </span>
                <Badge tone="warning">Counted Separately</Badge>
              </div>
              <p className="mt-0.5 text-xs text-neutral-600">
                Unregistered individuals are tracked separately and not blended into official registered population stats.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white px-4 py-2.5 border border-amber-200/70 shadow-sm shrink-0">
            <div className="text-center">
              <span className="block text-xs font-semibold text-neutral-500">Safe</span>
              <span className="text-base font-bold text-emerald-600">{data.unregistered_safe}</span>
            </div>
            <div className="h-7 w-px bg-neutral-200" />
            <div className="text-center">
              <span className="block text-xs font-semibold text-neutral-500">Needs Rescue</span>
              <span className="text-base font-bold text-rose-600">{data.unregistered_needs_rescue}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  sublabel,
  value,
  icon: Icon,
  tone,
  badgeText,
}: {
  label: string;
  sublabel: string;
  value: number;
  icon: typeof CheckCircle2;
  tone: "emerald" | "teal" | "rose" | "amber";
  badgeText: string;
}) {
  const styles = {
    emerald: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      badge: "success" as const,
      val: "text-emerald-700",
    },
    teal: {
      bg: "bg-teal-50 text-teal-700 border-teal-100",
      badge: "info" as const,
      val: "text-teal-700",
    },
    rose: {
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      badge: "danger" as const,
      val: "text-rose-700",
    },
    amber: {
      bg: "bg-amber-50 text-amber-700 border-amber-100",
      badge: "warning" as const,
      val: "text-amber-700",
    },
  }[tone];

  return (
    <Card radius="lg" className="transition-all hover:shadow-md">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className={`grid size-9 place-items-center rounded-xl border ${styles.bg}`}>
            <Icon className="size-4" />
          </span>
          <Badge tone={styles.badge}>{badgeText}</Badge>
        </div>
        <div>
          <span className={`text-2xl font-black tracking-tight ${styles.val}`}>{value}</span>
          <h4 className="text-xs font-bold text-neutral-800">{label}</h4>
          <p className="text-[11px] text-neutral-500">{sublabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}

