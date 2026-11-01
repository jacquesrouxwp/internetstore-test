import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dealText } from "./olx-telegram";
import type { TerminalDeal } from "./olx-store";

const deal = (over: Partial<TerminalDeal>): TerminalDeal =>
  ({
    id: "d1", olx_url: "https://www.olx.ua/d/uk/obyavlenie/x", title: "TH35", seller_name: null, seller_id: null,
    contacted_count: null, seller_label: null, city: "Київ", listed_at: null, product_slug: null, model_id: null,
    model: null, condition: null, grade: 8, has_box: true, has_docs: true, kit: null, condition_notes: null,
    asking_price: 30000, our_offer: null, bargain_at: null, final_price: null, status: "needs_ok", owner_decision: null,
    owner_decision_at: null, notes: null, chat: [], outbox: [], refresh_requested_at: null, created_at: "", updated_at: "",
    buy: null, ...over,
  }) as TerminalDeal;

describe("Telegram card: seller line", () => {
  it("shows the bot's label, escaped for HTML", () => {
    const t = dealText(deal({ seller_name: "Сергій", seller_label: "Сергій <ФОП> · писали 2 рази" }), "head");
    assert.match(t, /\nПродавець: Сергій &lt;ФОП&gt; · писали 2 рази\n/);
  });
  it("falls back to the name, and leaves the line out when there is neither", () => {
    assert.match(dealText(deal({ seller_name: "Сергій" }), "head"), /\nПродавець: Сергій\n/);
    assert.doesNotMatch(dealText(deal({}), "head"), /Продавець:/);
  });
});
