-- Remove Rix brand and all its products from the store.

-- Related competitor links (if any)
delete from public.competitor_product_links
where product_id in (
  select p.id from public.products p
  join public.brands b on b.id = p.brand_id
  where b.slug = 'rix'
);

delete from public.products
where brand_id in (select id from public.brands where slug = 'rix');

delete from public.brands where slug = 'rix';

-- Hide blog posts that compare Rix (if table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'blog_posts'
  ) then
    update public.blog_posts
    set published = false
    where slug ilike '%rix%';
  end if;
end $$;
