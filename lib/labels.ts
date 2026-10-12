import type { DealStage, LeadGroup, OfferStatus, Segment, TaskKind } from "@/lib/types";

export const SEGMENTS: Record<Segment, string> = {
  partner: "Партнёр",
  installer: "Монтажник",
  trader: "Торговая компания",
  private: "Частник",
  management: "Управляющая компания",
};

export const STAGES: { id: DealStage; title: string; hint: string }[] = [
  { id: "new", title: "Новый запрос", hint: "Ещё не разобрали" },
  { id: "qualify", title: "Квалификация", hint: "Уточняем объём и тип цены" },
  { id: "offer", title: "КП отправлено", hint: "Ждём ответ на предложение" },
  { id: "negotiate", title: "Согласование", hint: "Торгуемся по составу и сроку" },
  { id: "invoice", title: "Счёт", hint: "Ждём оплату" },
  { id: "won", title: "Выиграно", hint: "Сделка закрыта" },
  { id: "lost", title: "Проиграно", hint: "Ушло мимо" },
];

export const OFFER_STATUS: Record<OfferStatus, string> = {
  draft: "Черновик",
  sent: "Отправлено",
  accepted: "Принято",
  rejected: "Отклонено",
};

export const TASK_KIND: Record<TaskKind, string> = {
  call: "Звонок",
  email: "Письмо",
  meeting: "Созвон",
  offer: "КП",
  visit: "Выезд",
};

export function stageTitle(stage: DealStage) {
  return STAGES.find((item) => item.id === stage)?.title ?? stage;
}

export const OPEN_STAGES: DealStage[] = ["new", "qualify", "offer", "negotiate", "invoice"];

export const LEAD_GROUPS: { id: LeadGroup; title: string; hint: string }[] = [
  { id: "new", title: "Новые", hint: "Ещё не звонили или задачи нет" },
  { id: "no-answer", title: "Недозвон", hint: "Не взяли трубку" },
  { id: "reschedule", title: "Перенос сроков", hint: "Созвонились и перенесли дату" },
  { id: "feedback", title: "Обратная связь", hint: "Ждём ответ покупателя" },
  { id: "warm", title: "Теплые", hint: "Интерес есть, можно вести дальше" },
];

export function leadGroupTitle(group: LeadGroup) {
  return LEAD_GROUPS.find((item) => item.id === group)?.title ?? group;
}

const LEGACY_GROUP: Record<string, LeadGroup> = {
  "not-called": "new",
  "no-answer": "no-answer",
  callback: "reschedule",
  called: "warm",
};

export function leadGroupFromUnknown(group: unknown, legacyStatus?: unknown): LeadGroup {
  if (typeof group === "string" && LEAD_GROUPS.some((item) => item.id === group)) return group as LeadGroup;
  if (typeof legacyStatus === "string" && legacyStatus in LEGACY_GROUP) return LEGACY_GROUP[legacyStatus];
  return "new";
}
