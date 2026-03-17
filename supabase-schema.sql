-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)

-- Create the entries table
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  entry_date DATE NOT NULL,
  note TEXT NOT NULL,
  earnings_period TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own entries
CREATE POLICY "Users can view own entries"
  ON entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own entries
CREATE POLICY "Users can insert own entries"
  ON entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own entries
CREATE POLICY "Users can delete own entries"
  ON entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index for faster queries
CREATE INDEX entries_user_id_idx ON entries(user_id);
CREATE INDEX entries_earnings_period_idx ON entries(earnings_period);

-- Portfolio table (one row per user, stores raw ticker text)
CREATE TABLE portfolio (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tickers TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio"
  ON portfolio FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own portfolio"
  ON portfolio FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
  ON portfolio FOR UPDATE USING (auth.uid() = user_id);
