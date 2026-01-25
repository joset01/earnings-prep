# Earnings Prep - Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details and wait for it to initialize

## 2. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-schema.sql`
3. Click "Run" to create the table and RLS policies

## 3. Configure Environment Variables

1. In Supabase, go to **Settings > API**
2. Copy your project URL and anon key
3. Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Configure Auth (Optional)

By default, Supabase requires email confirmation. To disable for faster testing:

1. Go to **Authentication > Providers > Email**
2. Toggle off "Confirm email"

## 5. Run the App

```bash
npm run dev
```

Open http://localhost:3000

## 6. Deploy to Vercel

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy

## Usage

- Sign up with email/password
- Add entries in format: `TICKER MM/DD/YYYY: your note here`
- Select the earnings period (Q1-Q4 + year)
- Search/filter by ticker or note content
- Delete entries as needed
