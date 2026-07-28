-- Full blog_posts table (P0 blog)
-- Public SELECT only published; writes via service_role

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_uk text not null,
  title_ru text not null,
  excerpt_uk text,
  excerpt_ru text,
  body_uk text,
  body_ru text,
  cover_url text,
  category text,
  published boolean not null default false,
  published_at timestamptz,
  meta_title_uk text,
  meta_title_ru text,
  meta_description_uk text,
  meta_description_ru text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_at_idx
  on blog_posts (published_at desc nulls last);
create index if not exists blog_posts_category_idx on blog_posts (category);
create index if not exists blog_posts_published_idx on blog_posts (published);

alter table blog_posts enable row level security;

drop policy if exists "public read published blog_posts" on blog_posts;
create policy "public read published blog_posts"
  on blog_posts for select
  using (published = true);

-- Seed two guide articles (placeholder HTML body until owner replaces)
insert into blog_posts (
  slug, title_uk, title_ru, excerpt_uk, excerpt_ru, body_uk, body_ru,
  cover_url, category, published, published_at,
  meta_title_uk, meta_title_ru, meta_description_uk, meta_description_ru
) values
(
  'yak-obraty-teplovizor-2026',
  'Як обрати тепловізор у 2026 році',
  'Как выбрать тепловизор в 2026 году',
  'Короткий гід: матриця, об''єктив, NETD, бюджет і сценарії застосування.',
  'Короткий гид: матрица, объектив, NETD, бюджет и сценарии применения.',
  '<h2>На що звернути увагу</h2><p>У 2026 році ринок тепловізорів пропонує широкий вибір — від компактних монокулярів до прицілів преміум-класу. Нижче — практичний чекліст.</p><h3>Матриця</h3><ul><li><strong>256×192</strong> — вхідний рівень, розвідка на коротких дистанціях.</li><li><strong>384×288</strong> — золотий стандарт для більшості завдань.</li><li><strong>640×512</strong> — ідентифікація на великих відстанях.</li></ul><h3>NETD</h3><p>Чим нижче NETD (наприклад &lt;25 mK), тим краща деталізація в туман і дощ.</p><blockquote>Перед покупкою визначте сценарій: ліс, поле, місто чи нічне полювання.</blockquote><p>Порівняйте ціни на Pro-Optics з ринком — бейдж «дешевше» оновлюється автоматично.</p>',
  '<h2>На что обратить внимание</h2><p>В 2026 году рынок тепловизоров предлагает широкий выбор — от компактных монокуляров до прицелов премиум-класса. Ниже — практический чек-лист.</p><h3>Матрица</h3><ul><li><strong>256×192</strong> — входной уровень.</li><li><strong>384×288</strong> — золотой стандарт.</li><li><strong>640×512</strong> — идентификация на больших дистанциях.</li></ul><h3>NETD</h3><p>Чем ниже NETD (например &lt;25 mK), тем лучше детализация в туман и дождь.</p><blockquote>Перед покупкой определите сценарий: лес, поле, город или ночная охота.</blockquote><p>Сравните цены на Pro-Optics с рынком — бейдж «дешевле» обновляется автоматически.</p>',
  null,
  'Гайди',
  true,
  now() - interval '1 day',
  'Як обрати тепловізор у 2026 — гід Pro-Optics',
  'Как выбрать тепловизор в 2026 — гид Pro-Optics',
  'Гід з вибору тепловізора у 2026: матриця, NETD, об''єктив, бюджет.',
  'Гид по выбору тепловизора в 2026: матрица, NETD, объектив, бюджет.'
),
(
  'teplovizor-chy-pnb',
  'Тепловізор чи ПНБ',
  'Тепловизор или ПНВ',
  'Коли потрібен тепловізор, а коли класичний прилад нічного бачення.',
  'Когда нужен тепловизор, а когда классический прибор ночного видения.',
  '<h2>Коротко про різницю</h2><p><strong>Тепловізор</strong> «бачить» теплове випромінювання і працює в повній темряві, тумані, крізь легкий дим. <strong>ПНБ</strong> підсилює залишкове світло — залежить від місяця, зірок чи ІЧ-підсвітки.</p><h3>Оберіть тепловізор, якщо</h3><ul><li>потрібне виявлення в тумані / без місяця;</li><li>важлива робота вдень і вночі без зміни приладу;</li><li>немає можливості використовувати ІЧ-ліхтар.</li></ul><h3>Оберіть ПНБ, якщо</h3><ul><li>потрібна природна картинка обличчя/деталей при місяці;</li><li>бюджет обмежений на «класику» Gen2+/Gen3;</li><li>вже є ІЧ-підсвітка в системі.</li></ul><p>У каталозі Pro-Optics є обидва типи приладів — менеджер допоможе з підбором.</p>',
  '<h2>Коротко о разнице</h2><p><strong>Тепловизор</strong> «видит» тепловое излучение и работает в полной темноте, тумане, сквозь лёгкий дым. <strong>ПНВ</strong> усиливает остаточный свет — зависит от луны, звёзд или ИК-подсветки.</p><h3>Выберите тепловизор, если</h3><ul><li>нужно обнаружение в тумане / без луны;</li><li>важна работа днём и ночью без смены прибора;</li><li>нет возможности использовать ИК-фонарь.</li></ul><h3>Выберите ПНВ, если</h3><ul><li>нужна естественная картинка при луне;</li><li>бюджет ограничен на «классику» Gen2+/Gen3;</li><li>уже есть ИК-подсветка в системе.</li></ul><p>В каталоге Pro-Optics есть оба типа приборов — менеджер поможет с подбором.</p>',
  null,
  'Гайди',
  true,
  now() - interval '2 days',
  'Тепловізор чи ПНБ — що обрати',
  'Тепловизор или ПНВ — что выбрать',
  'Порівняння тепловізора і ПНБ: сценарії, плюси і мінуси.',
  'Сравнение тепловизора и ПНВ: сценарии, плюсы и минусы.'
)
on conflict (slug) do update set
  title_uk = excluded.title_uk,
  title_ru = excluded.title_ru,
  excerpt_uk = excluded.excerpt_uk,
  excerpt_ru = excluded.excerpt_ru,
  body_uk = excluded.body_uk,
  body_ru = excluded.body_ru,
  category = excluded.category,
  published = true,
  updated_at = now();
