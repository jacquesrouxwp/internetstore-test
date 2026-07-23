"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  X,
  Bot,
  ChevronLeft,
  ExternalLink,
  Send,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SOCIAL_BRAND,
  type SocialBrandId,
} from "@/components/ui/SocialIcons";
import {
  FAQ_RU,
  FAQ_UK,
  answerUserQuestion,
  type FaqItem,
} from "@/lib/ai-assistant";

const TG =
  process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/pro_optics_ua";
const VIBER =
  process.env.NEXT_PUBLIC_VIBER_URL || "viber://chat?number=%2B380501112233";
const WA =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  "https://wa.me/380501112233?text=%D0%94%D0%BE%D0%B1%D1%80%D0%BE%D0%B3%D0%BE%20%D0%B4%D0%BD%D1%8F";

type ChatMsg = {
  id: string;
  role: "user" | "bot";
  text: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ConsultWidget() {
  const t = useTranslations("consult");
  const locale = useLocale() as "uk" | "ru";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "chat">("menu");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const faq: FaqItem[] = locale === "ru" ? FAQ_RU : FAQ_UK;

  const welcome =
    locale === "ru"
      ? "Привет! Я AI-ассистент Pro-Optics. Выберите вопрос ниже или напишите свой — помогу с доставкой, оплатой и выбором тепловизора."
      : "Привіт! Я AI-асистент Pro-Optics. Оберіть питання нижче або напишіть своє — допоможу з доставкою, оплатою та вибором тепловізора.";

  // reset chat when opening AI
  const openChat = () => {
    setMode("chat");
    setMessages([{ id: uid(), role: "bot", text: welcome }]);
    setInput("");
    setTyping(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mode === "chat") setMode("menu");
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const toggleMain = () => {
    setOpen((v) => !v);
    setMode("menu");
    setTyping(false);
  };

  const pushBot = (text: string) => {
    setTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: uid(), role: "bot", text }]);
      setTyping(false);
    }, 450 + Math.random() * 350);
  };

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: trimmed },
    ]);
    setInput("");
    const answer = answerUserQuestion(trimmed, faq, locale);
    pushBot(answer);
  };

  const askQuick = (item: FaqItem) => {
    if (typing) return;
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: item.q },
    ]);
    pushBot(item.a);
  };

  return (
    <div
      ref={panelRef}
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3"
    >
      {open && (
        <div
          className="flex w-[min(100vw-1.5rem,360px)] flex-col overflow-hidden rounded-2xl"
          style={{
            background: "var(--surface, rgba(22,24,29,0.96))",
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
            boxShadow: "var(--shadow-card, 0 8px 30px rgba(0,0,0,0.5))",
            maxHeight: "min(78vh, 560px)",
          }}
          role="dialog"
          aria-label={t("title")}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
            style={{
              borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
            }}
          >
            <div className="min-w-0">
              {mode === "chat" ? (
                <button
                  type="button"
                  onClick={() => setMode("menu")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-90"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <Bot className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  <span>{t("aiTitle")}</span>
                </button>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">
                    {t("title")}
                  </p>
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

          {mode === "menu" ? (
            <ul className="shrink-0 p-2">
              <ChannelLink
                href={TG}
                brand="telegram"
                title="Telegram"
                hint={t("telegramHint")}
              />
              <ChannelLink
                href={VIBER}
                brand="viber"
                title="Viber"
                hint={t("viberHint")}
              />
              <ChannelLink
                href={WA}
                brand="whatsapp"
                title="WhatsApp"
                hint={t("whatsappHint")}
              />
              <li>
                <button
                  type="button"
                  onClick={openChat}
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
            /* —— AI CHAT —— */
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Messages */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {m.role === "bot" && (
                      <span
                        className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: "rgba(225, 29, 42, 0.15)",
                          color: "var(--accent)",
                        }}
                      >
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-md bg-[var(--accent)] text-white"
                          : "rounded-bl-md text-primary"
                      )}
                      style={
                        m.role === "bot"
                          ? {
                              background: "rgba(255,255,255,0.07)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }
                          : undefined
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <span
                      className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: "rgba(225, 29, 42, 0.15)",
                        color: "var(--accent)",
                      }}
                    >
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <div
                      className="rounded-2xl rounded-bl-md px-4 py-3 text-sm text-secondary"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick questions */}
              <div
                className="shrink-0 px-3 pb-2 pt-1"
                style={{
                  borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
                }}
              >
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-ui">
                  {t("quickQuestions")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {faq.map((item) => (
                    <button
                      key={item.q}
                      type="button"
                      disabled={typing}
                      onClick={() => askQuick(item)}
                      className="rounded-full border px-2.5 py-1 text-left text-[11px] font-medium text-secondary transition hover:border-[var(--accent)] hover:text-primary disabled:opacity-50"
                      style={{ borderColor: "var(--border-strong, rgba(255,255,255,0.15))" }}
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <form
                className="flex shrink-0 items-center gap-2 px-3 pb-3 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("inputPlaceholder")}
                  disabled={typing}
                  className="input min-w-0 flex-1 rounded-full py-2.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={typing || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
                  style={{ background: "var(--accent, #E11D2A)" }}
                  aria-label={t("send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

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

function ChannelLink({
  href,
  brand,
  title,
  hint,
}: {
  href: string;
  brand: SocialBrandId;
  title: string;
  hint: string;
}) {
  const { color, Icon } = SOCIAL_BRAND[brand];
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-white/[0.06]"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center"
          style={{ color }}
        >
          <Icon className="h-7 w-7" />
        </span>
        <span className="flex-1 text-left">
          <span className="block">{title}</span>
          <span className="block text-xs font-normal text-secondary">{hint}</span>
        </span>
        <ExternalLink className="h-3.5 w-3.5 text-muted-ui" />
      </a>
    </li>
  );
}
