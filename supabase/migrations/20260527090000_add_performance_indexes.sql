-- Migration: Add performance indexes for foreign keys and queries
-- Date: 2026-05-27
-- Description: Adds indexes on foreign key columns and frequently sorted columns to optimize sequential scans and locks during concurrent queries.

-- 1. Indexes for Group Members
CREATE INDEX IF NOT EXISTS idx_group_members_profile_id ON public.group_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);

-- 2. Indexes for Groups
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 3. Indexes for Cards
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);

-- 4. Indexes for Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON public.transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payer_id ON public.transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 5. Indexes for Transaction Splits
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON public.transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_debtor_id ON public.transaction_splits(debtor_id);
