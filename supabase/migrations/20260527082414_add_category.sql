-- Add category to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN category text DEFAULT 'Other' NOT NULL;
