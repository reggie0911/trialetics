-- Section-level reviewer notes on trip_reports (tab cards: attendees, CRFs, narrative, actions, attachments)
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS reviewer_comments_site_attendees TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_comments_sponsor_attendees TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_comments_monitored_crfs TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_comments_narrative TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_comments_open_actions TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_comments_attachments TEXT;
