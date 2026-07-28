"use client";

import { useEffect, useState } from "react";

type SettingsMap = Record<string, Record<string, unknown>>;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [tab, setTab] = useState("site");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setSettings((data.settings || {}) as SettingsMap);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (key: string) => {
    setMsg("Збереження…");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: settings[key] }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Збережено" : data.error || "Помилка");
  };

  const setField = (key: string, field: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }));
  };

  const changePassword = async () => {
    setMsg("…");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "password",
        currentPassword: curPass,
        newPassword: newPass,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Пароль змінено (зберігається bcrypt-хеш у БД)");
      setCurPass("");
      setNewPass("");
    } else {
      setMsg(data.error || "Помилка");
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-400">Завантаження…</p>;
  }

  const site = (settings.site || {}) as Record<string, unknown>;
  const social = (settings.social || {}) as Record<string, string>;
  const legal = (settings.legal || {}) as Record<string, string>;
  const delivery = (settings.delivery || {}) as Record<string, unknown>;
  const np = (settings.nova_poshta_sender || {}) as Record<string, string>;
  const templates = (settings.notify_templates || {}) as Record<string, string>;
  const inventory = (settings.inventory || {}) as Record<string, unknown>;
  const security = (settings.security || {}) as Record<string, unknown>;

  const tabs = [
    { id: "site", label: "Контакти" },
    { id: "social", label: "Соцмережі" },
    { id: "legal", label: "Реквізити" },
    { id: "delivery", label: "Доставка" },
    { id: "np", label: "НП відправник" },
    { id: "notify", label: "Шаблони" },
    { id: "security", label: "Безпека" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Налаштування</h1>
        <p className="text-sm text-zinc-500">
          Контакти, реквізити, НП, шаблони сповіщень — без коду
        </p>
      </div>

      {msg && (
        <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-800">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.id
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "site" && (
        <Panel
          onSave={() => save("site")}
          fields={
            <>
              <Field
                label="Назва"
                value={String(site.siteName || "")}
                onChange={(v) => setField("site", "siteName", v)}
              />
              <Field
                label="Email"
                value={String(site.email || "")}
                onChange={(v) => setField("site", "email", v)}
              />
              <Field
                label="Адреса"
                value={String(site.address || "")}
                onChange={(v) => setField("site", "address", v)}
              />
              <Field
                label="Години роботи"
                value={String(site.hours || "")}
                onChange={(v) => setField("site", "hours", v)}
              />
              <Field
                label="Телефони (через кому)"
                value={
                  Array.isArray(site.phones)
                    ? (site.phones as string[]).join(", ")
                    : ""
                }
                onChange={(v) =>
                  setField(
                    "site",
                    "phones",
                    v.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </>
          }
        />
      )}

      {tab === "social" && (
        <Panel
          onSave={() => save("social")}
          fields={
            <>
              <Field
                label="Telegram URL"
                value={social.telegram || ""}
                onChange={(v) => setField("social", "telegram", v)}
              />
              <Field
                label="Viber"
                value={social.viber || ""}
                onChange={(v) => setField("social", "viber", v)}
              />
              <Field
                label="WhatsApp"
                value={social.whatsapp || ""}
                onChange={(v) => setField("social", "whatsapp", v)}
              />
            </>
          }
        />
      )}

      {tab === "legal" && (
        <Panel
          onSave={() => save("legal")}
          fields={
            <>
              <Field
                label="ФОП / ТОВ"
                value={legal.entityName || ""}
                onChange={(v) => setField("legal", "entityName", v)}
              />
              <Field
                label="ЄДРПОУ"
                value={legal.edrpou || ""}
                onChange={(v) => setField("legal", "edrpou", v)}
              />
              <Field
                label="ІПН"
                value={legal.ipn || ""}
                onChange={(v) => setField("legal", "ipn", v)}
              />
              <Field
                label="Юр. адреса"
                value={legal.legalAddress || ""}
                onChange={(v) => setField("legal", "legalAddress", v)}
              />
            </>
          }
        />
      )}

      {tab === "delivery" && (
        <Panel
          onSave={() => save("delivery")}
          fields={
            <>
              <Field
                label="Доставка за замовч. (грн)"
                value={String(delivery.defaultCost ?? 0)}
                onChange={(v) =>
                  setField("delivery", "defaultCost", Number(v) || 0)
                }
              />
              <Field
                label="Безкоштовно від суми (грн, 0 = вимк.)"
                value={String(delivery.freeFrom ?? 0)}
                onChange={(v) =>
                  setField("delivery", "freeFrom", Number(v) || 0)
                }
              />
              <Field
                label="Примітка"
                value={String(delivery.note || "")}
                onChange={(v) => setField("delivery", "note", v)}
              />
              <Field
                label="Поріг «мало на складі»"
                value={String(inventory.lowStockThreshold ?? 2)}
                onChange={(v) => {
                  setField("inventory", "lowStockThreshold", Number(v) || 2);
                }}
              />
              <button
                type="button"
                onClick={() => save("inventory")}
                className="text-xs text-sky-700 underline"
              >
                Зберегти поріг складу окремо
              </button>
            </>
          }
        />
      )}

      {tab === "np" && (
        <Panel
          onSave={() => save("nova_poshta_sender")}
          fields={
            <>
              <p className="text-xs text-zinc-500">
                Ref-и з кабінету НП (API). Потрібен також{" "}
                <code className="rounded bg-zinc-100 px-1">
                  NOVA_POSHTA_API_KEY
                </code>{" "}
                у Vercel.
              </p>
              {(
                [
                  ["cityRef", "CitySender Ref"],
                  ["cityName", "Місто (назва)"],
                  ["senderRef", "Sender Ref"],
                  ["senderAddressRef", "SenderAddress Ref"],
                  ["contactSender", "ContactSender Ref"],
                  ["sendersPhone", "Телефон відправника"],
                  ["warehouseRef", "Склад (опц.)"],
                ] as const
              ).map(([k, label]) => (
                <Field
                  key={k}
                  label={label}
                  value={np[k] || ""}
                  onChange={(v) => setField("nova_poshta_sender", k, v)}
                />
              ))}
            </>
          }
        />
      )}

      {tab === "notify" && (
        <Panel
          onSave={() => save("notify_templates")}
          fields={
            <>
              <p className="text-xs text-zinc-500">
                Плейсхолдери: {"{orderNumber}"}, {"{trackingNumber}"},{" "}
                {"{customerName}"}, {"{status}"}
              </p>
              {Object.keys(templates).map((k) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">
                    {k}
                  </span>
                  <textarea
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    rows={2}
                    value={templates[k] || ""}
                    onChange={(e) =>
                      setField("notify_templates", k, e.target.value)
                    }
                  />
                </label>
              ))}
            </>
          }
        />
      )}

      {tab === "security" && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-600">
            {security.hasPassword
              ? "У БД збережено bcrypt-хеш. Env-пароль — для відновлення."
              : "Поки використовується ADMIN_PASSWORD з env. Після зміни — хеш у БД."}
          </p>
          <Field
            label="Поточний пароль"
            value={curPass}
            onChange={setCurPass}
            type="password"
          />
          <Field
            label="Новий пароль (мін. 8)"
            value={newPass}
            onChange={setNewPass}
            type="password"
          />
          <button
            type="button"
            onClick={changePassword}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Змінити пароль
          </button>
        </div>
      )}
    </div>
  );
}

function Panel({
  fields,
  onSave,
}: {
  fields: React.ReactNode;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {fields}
      <button
        type="button"
        onClick={onSave}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Зберегти
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      <input
        type={type}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
