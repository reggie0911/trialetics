-- Phase 1: Study Personnel
-- Add country and address_id columns to protocol_contacts for per-study tracking

ALTER TABLE public.protocol_contacts
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL;
