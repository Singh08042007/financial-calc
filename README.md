# Financial Calculator 

A responsive EMI & Budget Tracker web app with Supabase authentication and database.

## Database Setup

Run this SQL in your Supabase SQL Editor to create the required tables:

```sql
-- User profiles table to store UPI IDs
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  upi_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow anyone to read profiles (for payment UPI lookup)
CREATE POLICY "Anyone can read profiles"
  ON user_profiles FOR SELECT
  USING (true);

-- Loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  principal NUMERIC NOT NULL,
  annual_rate NUMERIC NOT NULL,
  months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  monthly_emi NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER loans_set_user_id
  BEFORE INSERT ON loans
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Loan payments table
CREATE TABLE loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  paid_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments for own loans"
  ON loan_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own loans"
  ON loan_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

-- Budget categories table
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON budget_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON budget_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER budget_categories_set_user_id
  BEFORE INSERT ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER transactions_set_user_id
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();
```

## Setup

1. Create a Supabase project
2. Run the SQL schema above
3. Update `assets/config.js` with your Supabase URL and anon key
4. Deploy or run locally

