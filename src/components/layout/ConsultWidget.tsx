"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MessageCircle,
  X,
  Send,
  Phone,
  Bot,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TG =
  process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/pro_optics_ua";
const VIBER =
  process.env.NEXT_PUBLIC_VIBER_URL || "viber://chat?number=%2B380501112233";
const WA =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  "https://wa.me/380501112233?text=%D0%94%D0%BE%D0%B1%D1%80%D0%BE%D0%B3%D0%BE%20%D0%B4%D0%BD%D1%8F!%20%D0%9F%D0%BE%D1%82%D1%80%D1%96%D0%B1%D0%BD%D0%B0%20%D0%BA%D0%BE%D0%BD%D1%81%D1%83%D0%BB%D1%8C%D1%82%D0%B0%D1%86%D1%96%D1%8F";

type FaqItem = { q: string; a: string };

const FAQ_UK: FaqItem[] = [
  {
    q: "Яка доставка?",
    a: "Доставляємо Новою Поштою по всій Україні, зазвичай 1–2 дні. Від 50 000 грн — доставка безкоштовна (умови магазину).",
  },
  {
    q: "Які способи оплати?",
    a: "Оплата при отриманні, а також онлайн (Monobank / LiqPay / WayForPay) — за наявності підключення.",
  },
  {
    q: "Як обрати матрицю тепловізора?",
    a: "256×192 — ближні дистанції, 384×288 — універсальний вибір, 640×512 — максимальна деталізація на дальніх дистанціях.",
  },
  {
    q: "Чи є гарантія?",
    a: "Так, офіційна гарантія виробника. Допомога з налаштуванням і прошивкою — через наших менеджерів.",
  },
  {
    q: "Чи можна повернути товар?",
    a: "Так, протягом 14 днів за умови збереження товарного вигляду та комплектації. Деталі — у розділі «Гарантія та сервіс».",
  },
];

const FAQ_RU: FaqItem[] = [
  {
    q: "Какая доставка?",
    a: "Доставляем Новой Почтой по всей Украине, обычно 1–2 дня. От 50 000 грн — доставка бесплатная (условия магазина).",
  },
  {
    q: "Какие способы оплаты?",
    a: "Оплата при получении, а также онлайн (Monobank / LiqPay / WayForPay) — при наличии подключения.",
  },
  {
    q: "Как выбрать матрицу тепловизора?",
    a: "256×192 — ближние дистанции, 384×288 — универсальный выбор, 640×512 — максимальная детализация на дальних дистанциях.",
  },
  {
    q: "Есть ли гарантия?",
    a: "Да, официальная гарантия производителя. Помощь с настройкой и прошивкой — через наших менеджеров.",
  },
  {
    q: "Можно ли вернуть товар?",
    a: "Да, в течение 14 дней при сохранении товарного вида и комплектации. Подробности — в разделе «Гарантия и сервис».",
  },
];

export function ConsultWidget() {
  const t = useTranslations("consult");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const faq = locale === "ru" ? FAQ_RU : FAQ_UK;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFaqOpen(false);
        setActiveFaq(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (faqOpen) {
          setFaqOpen(false);
          setActiveFaq(null);
        } else {
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, faqOpen]);

  const toggleMain = () => {
    setOpen((v) => !v);
    setFaqOpen(false);
    setActiveFaq(null);
  };

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {/* Menu / FAQ panel */}
      {open && (
        <div
          className="w-[min(100vw-2rem,320px)] overflow-hidden rounded-2xl shadow-lift animate-in"
          style={{
            background: "var(--surface, rgba(22,24,29,0.96))",
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            boxShadow: "var(--shadow-card, 0 8px 30px rgba(0,0,0,0.5))",
          }}
          role="dialog"
          aria-label={t("title")}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))" }}
          >
            <div className="min-w-0">
              {faqOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setFaqOpen(false);
                    setActiveFaq(null);
                  }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-90"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("back")}
                </button>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">{t("title")}</p>
                  <p className="text-xs text-secondary">{t("subtitle")}</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={toggleMain}
              className="rounded-full p-1.5 text-muted-ui transition hover:bg-white/[0.06] hover:text-primary"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!faqOpen ? (
            <ul className="p-2">
              <li>
                <a
                  href={TG}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-white/[0.06]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9]/15 text-[#229ED9]">
                    <Send className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block">Telegram</span>
                    <span className="block text-xs font-normal text-secondary">
                      {t("telegramHint")}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-ui" />
                </a>
              </li>
              <li>
                <a
                  href={VIBER}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-white/[0.06]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7360F2]/15 text-[#7360F2]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block">Viber</span>
                    <span className="block text-xs font-normal text-secondary">
                      {t("viberHint")}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-ui" />
                </a>
              </li>
              <li>
                <a
                  href={WA}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-white/[0.06]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block">WhatsApp</span>
                    <span className="block text-xs font-normal text-secondary">
                      {t("whatsappHint")}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-ui" />
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setFaqOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-white/[0.06]"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(225, 29, 42, 0.12)",
                      color: "var(--accent, #E11D2A)",
                    }}
                  >
                    <Bot className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block">{t("aiTitle")}</span>
                    <span className="block text-xs font-normal text-secondary">
                      {t("aiHint")}
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          ) : (
            <div className="max-h-[min(60vh,380px)] overflow-y-auto p-2">
              <p className="mb-2 px-2 text-xs text-secondary">{t("aiIntro")}</p>
              <ul className="space-y-1">
                {faq.map((item, i) => {
                  const openItem = activeFaq === i;
                  return (
                    <li key={item.q}>
                      <button
                        type="button"
                        onClick={() => setActiveFaq(openItem ? null : i)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2.5 text-left text-sm transition",
                          openItem
                            ? "bg-white/[0.06]"
                            : "hover:bg-white/[0.04]"
                        )}
                      >
                        <span className="font-medium text-primary">{item.q}</span>
                        {openItem && (
                          <span className="mt-1.5 block text-xs leading-relaxed text-secondary">
                            {item.a}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 px-2 pb-2 text-center text-[11px] text-muted-ui">
                {t("aiFooter")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={toggleMain}
        aria-expanded={open}
        aria-label={t("title")}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lift transition",
          "bg-[var(--accent,#E11D2A)] hover:bg-[var(--accent-hover,#c41824)]",
          open && "ring-2 ring-white/20"
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
        <span className="hidden sm:inline">{t("fab")}</span>
      </button>
    </div>
  );
}
