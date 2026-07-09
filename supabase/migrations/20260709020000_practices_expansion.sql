-- Practices expansion: time capsules and three new feed practices.

-- A note tucked in at planting, unsealed at harvest.
alter table public.dreams add column capsule_text text;

insert into public.feed_activities (key, title, description, health_boost, sort_order) values
  ('compost_doubts', 'Compost a doubt', 'Write down a worry or doubt — then compost it. Doubts break down into nourishment here.', 15, 7),
  ('rampage', 'Rampage of appreciation', 'Sixty seconds. Say everything you appreciate, as fast as it comes. Don''t stop.', 15, 8),
  ('future_letter', 'A letter from your future self', 'Receive a letter from the you whose dream already came true.', 15, 9);
