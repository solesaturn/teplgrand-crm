import { callbackDue, callbackOverdue } from "@/lib/format";
import type { Lead } from "@/lib/types";

export function todayCallsOf(leads: Lead[], now = new Date()) {
  const ranked = leads.flatMap((lead) => {
    if (lead.group === "reschedule") {
      if (!callbackDue(lead.callbackAt, now)) return [];
      return [{ lead, bucket: callbackOverdue(lead.callbackAt, now) ? 0 : 1, time: lead.callbackAt ?? "" }];
    }
    if (lead.group === "no-answer") return [{ lead, bucket: 2, time: lead.name }];
    if (lead.group === "new") return [{ lead, bucket: 3, time: lead.name }];
    return [];
  });
  ranked.sort((a, b) => a.bucket - b.bucket || a.time.localeCompare(b.time, "ru") || a.lead.name.localeCompare(b.lead.name, "ru"));
  return ranked.map((item) => item.lead);
}
