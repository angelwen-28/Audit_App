-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    role TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    initial_balance NUMERIC DEFAULT 0,
    students INTEGER DEFAULT 0,
    fee NUMERIC DEFAULT 0,
    membership NUMERIC DEFAULT 0,
    sanctions NUMERIC DEFAULT 0,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_cost NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security (RLS) or public access for demo purposes.
-- To allow public read/write access for this demo app, you can run:
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Add semester (1 or 2) and school_year columns to events table
ALTER TABLE events
  ADD COLUMN semester INTEGER CHECK (semester IN (1,2)) DEFAULT 1,
  ADD COLUMN school_year TEXT;

