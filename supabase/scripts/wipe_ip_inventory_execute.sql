-- =============================================================================
-- EXECUTE: Remove ALL Inventory Management (IP) rows (all studies)
-- =============================================================================
-- DESTRUCTIVE — cannot be undone without backup / PITR.
-- Run in Supabase SQL Editor as postgres, or: psql "$DATABASE_URL" -f this file
-- Do NOT use anon/authenticated PostgREST keys; RLS will block or scope deletes.
-- Full runbook + study-scoped variant: wipe_ip_inventory.sql
-- =============================================================================

BEGIN;

DELETE FROM public.ip_order_documents;
DELETE FROM public.ip_ledger_entries;
DELETE FROM public.ip_lot_locations;
DELETE FROM public.ip_orders;
DELETE FROM public.ip_lots;
DELETE FROM public.ip_item_site_links;
DELETE FROM public.ip_items;

COMMIT;
