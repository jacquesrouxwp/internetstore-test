import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LENGTH,
  lintDescriptions,
  lintProduct,
  repeatedLeads,
  type LintCode,
  type LintProduct,
} from "./description-lint";

const SPECS = {
  "Роздільна здатність матриці": "640x512",
  "Крок пікселя, мкм": "12",
  "Об'єктив, мм": "35",
  "Дальність виявлення людини, м": "1800",
  "Вага, г": "450",
  "Частота кадрів, Гц": "50",
  "Ступінь захисту": "IP67",
  "Час роботи, год": "8",
};

/**
 * Sentences that quote only the spec sheet above. Joined to the length the
 * gate wants, they make a description that should pass every rule.
 */
const CLEAN_UK = [
  "Pulsar Telos XG35 — тепловізійний монокуляр для спостереження в полі вночі.",
  "Матриця 640x512 з кроком 12 мкм дає дрібну картинку навіть на далеких контурах.",
  "Об'єктив 35 мм тримає широке поле, тож стежку й узлісся видно без постійного повороту.",
  "Людину прилад виявляє на відстані до 1800 м, а цього вистачає для огляду великого поля.",
  "Частота 50 Гц прибирає смикання, коли тварина рухається або коли ви йдете з приладом.",
  "Корпус зі ступенем захисту IP67 витримує дощ і сніг протягом довгого чергування.",
  "Вага 450 г дозволяє носити монокуляр у кишені куртки цілу ніч без втоми руки.",
  "Від одного заряду він працює близько 8 год, тож запасний акумулятор потрібен не завжди.",
  "Для мисливця, що веде облік звіра, це зручний інструмент на кожен вихід у темряві.",
  "Для охорони периметра він теж підходить: огляд швидкий, а керування просте й зрозуміле.",
  "Тим, кому треба розрізняти дрібні деталі здалеку, варто дивитися модель з довшим об'єктивом.",
  "Перед покупкою перевірте, як лежить прилад у руці, і чи зручно тягнутися до кнопок.",
  "Комплект і гарантію уточнює консультант під час підтвердження замовлення телефоном.",
  "Прилад добре доповнює бінокль, коли треба швидко глянути на тепловий контур без зайвих рухів.",
  "Увечері він швидко готовий до роботи, тож огляд можна почати одразу після виходу з машини.",
];

const CLEAN_RU = [
  "Pulsar Telos XG35 — тепловизионный монокуляр для наблюдения в поле ночью.",
  "Матрица 640x512 с шагом 12 мкм даёт мелкую картинку даже на далёких контурах.",
  "Объектив 35 мм держит широкое поле, поэтому тропу и опушку видно без постоянного поворота.",
  "Человека прибор обнаруживает на расстоянии до 1800 м, и этого хватает для осмотра большого поля.",
  "Частота 50 Гц убирает подёргивание, когда животное движется или когда вы идёте с прибором.",
  "Корпус со степенью защиты IP67 выдерживает дождь и снег во время долгого дежурства.",
  "Вес 450 г позволяет носить монокуляр в кармане куртки всю ночь без усталости руки.",
  "От одного заряда он работает около 8 ч, поэтому запасной аккумулятор нужен не всегда.",
  "Для охотника, который ведёт учёт зверя, это удобный инструмент на каждый выход в темноте.",
  "Для охраны периметра он тоже подходит: осмотр быстрый, а управление простое и понятное.",
  "Тем, кому нужно различать мелкие детали издалека, стоит смотреть модель с более длинным объективом.",
  "Перед покупкой проверьте, как лежит прибор в руке и удобно ли тянуться к кнопкам.",
  "Комплект и гарантию уточняет консультант при подтверждении заказа по телефону.",
  "Прибор хорошо дополняет бинокль, когда нужно быстро взглянуть на тепловой контур.",
  "С вышки он тоже удобен: поле осматривается быстро и без лишних движений.",
];

function fit(parts: string[]): string {
  let text = "";
  for (const s of parts) {
    if ((text + " " + s).trim().length > LENGTH.max) break;
    text = (text + " " + s).trim();
  }
  return text;
}

function product(over: Partial<LintProduct> = {}): LintProduct {
  return {
    slug: "pulsar-telos-xg35",
    sku: "TEST-TELOS-XG35",
    nameUk: "Тепловізор Pulsar Telos XG35",
    nameRu: "Тепловизор Pulsar Telos XG35",
    categorySlug: "teplovizori",
    deviceType: "mono",
    descriptionUk: fit(CLEAN_UK),
    descriptionRu: fit(CLEAN_RU),
    specs: SPECS,
    ...over,
  };
}

const codes = (p: LintProduct, locale: "uk" | "ru" = "uk"): LintCode[] =>
  lintProduct(p)
    .filter((i) => i.locale === locale)
    .map((i) => i.code);

describe("description gate", () => {
  it("passes a description written from the spec sheet", () => {
    const p = product();
    assert.ok(p.descriptionUk!.length >= LENGTH.min, `fixture too short: ${p.descriptionUk!.length}`);
    assert.ok(p.descriptionRu!.length >= LENGTH.min, `fixture too short: ${p.descriptionRu!.length}`);
    assert.deepEqual(lintProduct(p), []);
  });

  it("refuses the generator text that went live on 2 October", () => {
    const text =
      fit(CLEAN_UK) .slice(0, 900) +
      " Головний орієнтир у цифрах: матриця 640x512." +
      " Для стрільби цього формфактора недостатньо — потрібен тепловізійний приціл або насадка." +
      " Окремо зазначено оптичне збільшення — Ні." +
      " Габарити допомагають зрозуміти, як прилад сяде в рюкзак чи на зброю.";
    const found = new Set(codes(product({ descriptionUk: text })));
    for (const code of ["glue", "weapon", "yes-no"] as const) {
      assert.ok(found.has(code), `expected ${code}, got ${Array.from(found).join(", ")}`);
    }
  });

  it("holds a figure against the spec sheet", () => {
    const base = fit(CLEAN_UK).slice(0, 1300);
    const invented = product({ descriptionUk: base + " Ідентифікацію людини він дає на 600 м." });
    const issue = lintProduct(invented).find((i) => i.code === "figure");
    assert.ok(issue, "600 is not in the sheet");
    assert.match(issue!.detail, /600/);
    assert.ok(!codes(product()).includes("figure"));
  });

  it("does not count small numbers or years as figures, and reads grouped thousands", () => {
    const text =
      fit(CLEAN_UK).slice(0, 1300) +
      " У комплекті 2 акумулятори, модель 2025 року. Розпізнавання — до 2 500 м.";
    const withRange = product({
      descriptionUk: text,
      specs: { ...SPECS, "Дальність розпізнавання, м": "2 500" },
    });
    assert.ok(!codes(withRange).includes("figure"));
  });

  it("knows figures only from the name and the spec sheet", () => {
    // The admin export also holds ids, image URLs, dates and stock; their digit
    // runs must not make an invented range look known (ATN OTS-HD 640 5-50X).
    const noisy = product({
      id: "d3c1f600-79df-4673-9cc9-8c6e1b2e4054",
      images: ["https://x.supabase.co/storage/v1/object/public/product-images/optics-pro/img-600.jpg"],
      createdAt: "2026-06-00T09:40:24.822+00:00",
      stock: 600,
      descriptionUk: fit(CLEAN_UK).slice(0, 1300) + " Ідентифікацію людини він дає на 600 м.",
    });
    const issue = lintProduct(noisy).find((i) => i.code === "figure" && i.locale === "uk");
    assert.ok(issue, "600 appears only outside the spec sheet");
    assert.match(issue!.detail, /600/);
  });

  it("does not let a description quote the price", () => {
    const text = fit(CLEAN_UK).slice(0, 1300) + " Коштує близько 118700 грн.";
    const issue = lintProduct(product({ descriptionUk: text, price: 118700 })).find((i) => i.code === "figure");
    assert.ok(issue, "the price is not a spec");
  });

  it("asks for the model in the opening", () => {
    const text = fit(CLEAN_UK.slice(1)) ;
    assert.ok(codes(product({ descriptionUk: text })).includes("model"));
  });

  it("catches a letter from the other language", () => {
    const uk = fit(CLEAN_UK).replace("поле", "полэ");
    assert.ok(codes(product({ descriptionUk: uk })).includes("language"));
    const ru = fit(CLEAN_RU).replace("поле", "полі");
    assert.ok(codes(product({ descriptionRu: ru }), "ru").includes("language"));
  });

  it("refuses superlatives and talk of reviews", () => {
    const text = fit(CLEAN_UK).slice(0, 1300) + " Це найкращий монокуляр, судячи з відгуків.";
    assert.ok(codes(product({ descriptionUk: text })).includes("superlative"));
  });

  it("reports a missing translation and a wrong length", () => {
    assert.ok(codes(product({ descriptionRu: "" }), "ru").includes("missing"));
    assert.ok(codes(product({ descriptionUk: CLEAN_UK[0] })).includes("length"));
  });

  it("leaves weapon words to sights, which are not in the feed", () => {
    const sight = product({
      sku: "TEST-SIGHT",
      categorySlug: "pricili",
      deviceType: "scope",
      nameUk: "Тепловізійний приціл Pulsar Thermion 2 XG35",
      descriptionUk: fit(["Pulsar Thermion 2 XG35 — приціл для стрільби вночі.", ...CLEAN_UK.slice(1)]),
    });
    assert.ok(!codes(sight).includes("weapon"));
  });

  it("lets an accessory talk about mounts but not about weapons", () => {
    const helmet = product({
      sku: "TEST-HELMET",
      categorySlug: "aksesuary",
      deviceType: null,
      nameUk: "Адаптер на шолом Udapt THM-2",
      descriptionUk: fit([
        "Udapt THM-2 — кріплення, що фіксує тепловізор на шоломі.",
        ...CLEAN_UK.slice(1),
      ]),
    });
    assert.ok(!codes(helmet).includes("weapon"));
    const onWeapon = { ...helmet, descriptionUk: helmet.descriptionUk + " Блок сяде на зброю." };
    assert.ok(codes(onWeapon).includes("weapon"));
  });
});

describe("repeated sentence openings", () => {
  const opening = "Об'єктив 35 мм зі світлосилою F1.0 тримає широке поле.";
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      product({ slug: `p-${i}`, descriptionUk: `Модель ${i}. ${opening}`, descriptionRu: "Текст." }),
    );

  it("reports an opening shared by more than five products", () => {
    const found = repeatedLeads(many(6)).find((r) => r.locale === "uk");
    assert.ok(found, "six products share the opening");
    assert.equal(found!.count, 6);
  });

  it("allows five", () => {
    assert.equal(repeatedLeads(many(5)).filter((r) => r.locale === "uk").length, 0);
  });

  it("does not count figures and models as differences", () => {
    const varied = Array.from({ length: 6 }, (_, i) =>
      product({
        slug: `v-${i}`,
        descriptionUk: `Об'єктив ${20 + i} мм зі світлосилою F1.${i} тримає широке поле.`,
        descriptionRu: "Текст.",
      }),
    );
    assert.equal(repeatedLeads(varied).filter((r) => r.locale === "uk").length, 1);
  });

  it("puts repeats and per-product issues in one report", () => {
    const report = lintDescriptions(many(6));
    assert.ok(report.repeated.length >= 1);
    assert.ok(report.products.length >= 1);
  });
});
