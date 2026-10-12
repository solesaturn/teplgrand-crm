import type { CallStatus, DealStage, OfferStatus, Segment, TaskKind } from "@/lib/types";

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

export const CALL_STATUS: { id: CallStatus; title: string; hint: string }[] = [
  { id: "not-called", title: "Не звонили", hint: "Ещё не набирали" },
  { id: "no-answer", title: "Недозвон", hint: "Не взяли трубку" },
  { id: "callback", title: "Перезвонить", hint: "Договорились набрать ещё раз" },
  { id: "called", title: "Уже звонили", hint: "Разговор состоялся" },
];

export function callStatusTitle(status: CallStatus) {
  return CALL_STATUS.find((item) => item.id === status)?.title ?? status;
}
