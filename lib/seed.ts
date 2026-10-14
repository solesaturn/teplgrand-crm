import { SEED_ADMIN } from "@/lib/auth";
import type { CrmData } from "@/lib/types";

export function createSeed(): CrmData {
  return {
    companies: [],
    contacts: [],
    deals: [],
    offers: [],
    tasks: [],
    sellers: [],
    admins: [{ ...SEED_ADMIN }],
    leads: [],
    sellerNotes: [],
    leadCalls: [],
  };
}
