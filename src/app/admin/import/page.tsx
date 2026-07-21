"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminImportPage() {
  const [xml, setXml] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(url ? { url } : { xml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(`Imported ${data.imported} products`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setXml(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Prom.ua YML/XML</h1>
        <p className="mt-2 text-sm text-muted">
          Paste XML feed or provide URL. Parser supports standard YML{" "}
          <code className="rounded bg-canvas px-1">offer</code> nodes (name,
          price, oldprice, picture, vendor, param).
        </p>
      </div>

      <div className="card-surface space-y-4 p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Feed URL (optional)</span>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/export/yml"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Or upload file</span>
          <input
            type="file"
            accept=".xml,.yml"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Or paste XML</span>
          <textarea
            className="input min-h-[200px] font-mono text-xs"
            value={xml}
            onChange={(e) => setXml(e.target.value)}
            placeholder='<?xml version="1.0"?><yml_catalog>…'
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={run}
        >
          {loading ? "Importing…" : "Import"}
        </button>
        {result && <p className="text-sm font-medium">{result}</p>}
        <Link href="/admin/products" className="block text-sm text-accent">
          → View products
        </Link>
      </div>
    </div>
  );
}
