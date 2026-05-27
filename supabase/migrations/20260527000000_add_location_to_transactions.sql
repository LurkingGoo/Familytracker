-- Migration: Add location column to transactions

-- 1. Add location to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS location text;
