-- Add currency, foreign_amount, exchange_rate, and state to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN currency text DEFAULT 'SGD' NOT NULL,
  ADD COLUMN foreign_amount numeric DEFAULT 0 NOT NULL,
  ADD COLUMN exchange_rate numeric DEFAULT 1.0 NOT NULL,
  ADD COLUMN state text;
