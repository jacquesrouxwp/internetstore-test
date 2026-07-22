import type { OrderStatus } from "@/types";

/** Workflow: Новий → В обробці → Відправлено → Виконано */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "new",
  "processing",
  "shipped",
  "done",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новий",
  processing: "В обробці",
  shipped: "Відправлено",
  done: "Виконано",
  cancelled: "Скасовано",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  processing: "bg-amber-100 text-amber-800",
  shipped: "bg-violet-100 text-violet-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-600",
};

export const PRODUCT_FLAG_LABELS = {
  isHit: "Хит",
  isNew: "Новинка",
  isTop: "Топ продаж",
  isSale: "Скидка",
} as const;

/** Common product spec field keys (UA labels stored as keys in specs) */
export const SPEC_FIELDS = [
  { key: "Матриця", placeholder: "напр. 384×288" },
  { key: "Тип", placeholder: "моно / приціл / бінокль" },
  { key: "NETD", placeholder: "напр. <25 mK" },
  { key: "Частота", placeholder: "напр. 50 Гц" },
  { key: "Захист", placeholder: "напр. IP67" },
  { key: "Дальність виявлення людини, м", placeholder: "напр. 1800" },
  { key: "Об'єктив", placeholder: "напр. 35 мм" },
  { key: "Збільшення", placeholder: "напр. 2.5–20×" },
  { key: "Вага", placeholder: "напр. 380 г" },
] as const;

export const DEVICE_TYPES = [
  { value: "mono", label: "Монокуляр" },
  { value: "scope", label: "Приціл" },
  { value: "binocular", label: "Бінокль" },
  { value: "clipon", label: "Насадка" },
] as const;
