-- Short titles: dreams.title becomes a 2-5 word wish summary (coach-written
-- at planting); the user's full original wish moves to wish_text so the
-- coach never loses context.
alter table public.dreams add column wish_text text;

-- Existing dreams: their title IS the original wish.
update public.dreams set wish_text = title where wish_text is null;
