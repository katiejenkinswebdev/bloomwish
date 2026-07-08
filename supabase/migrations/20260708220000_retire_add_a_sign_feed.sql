-- "Add a Sign" leaves the feed library — Signs are their own first-class act
-- (plant sheet / post-session nudge), and logging one now feeds growth
-- directly, so the duplicate feed entry only confused the two paths.
update public.feed_activities set is_active = false where key = 'add_a_sign';
