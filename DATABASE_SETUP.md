# 🚀 Complete Supabase Setup Guide

## Current Status
✅ Multi-project system implemented  
⚠️ Database not configured - you'll see "Upload error" until setup is complete  
✅ Development server running at `http://localhost:3000`

## 🔧 Step-by-Step Setup

### 1. Create Supabase Project
1. Go to **[supabase.com](https://supabase.com)** and sign up/login
2. Click **"New Project"**
3. Choose a name and database password
4. Wait for project to be created (2-3 minutes)

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public key** (long string starting with `eyJ`)

### 3. Update Environment File
Edit the `.env` file in your project root:
```bash
# Replace these placeholder values with your actual Supabase credentials
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON=your-actual-anon-key-here
```

### 4. Create Database Tables
1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase/migrations/001_initial_tables.sql`
3. Click **"Run"** 
4. Copy and paste the contents of `supabase/migrations/002_add_projects.sql` 
5. Click **"Run"**
6. **⚠️ CRITICAL:** Copy and paste the contents of `supabase/migrations/003_fix_table_constraints.sql` 
7. Click **"Run"**

**Why Migration 003 is Essential:**
Without this migration, users cannot upload data with the same table IDs across different projects. The system will throw constraint violation errors because table IDs must be globally unique instead of unique per project.

### 5. Verify Setup
1. Restart your dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. You should see the upload interface without errors
4. Try uploading an Excel file with 4 sheets or 4 CSV files

## 🎯 What You'll Get After Setup

**Multi-Project Features:**
- 📊 Project tabs at the top to switch between visualizations
- 📁 Upload Excel files (single file with 4 sheets) or CSV files (4 separate files)
- ✏️ Name your projects during upload
- ⚙️ Rename/delete projects with context menus
- 📈 See table counts as badges on project tabs
- 🔄 Data isolation per project

**Expected Database Tables:**
- `projects` - project metadata
- `tables` - BigQuery table info (project-scoped)  
- `lineages` - table relationships (project-scoped)
- `dashboards` - dashboard info (project-scoped)
- `dashboard_tables` - dashboard-table mappings (project-scoped)

## 🔍 Troubleshooting

**Still seeing "Upload error"?**
- Check your `.env` file has real Supabase URLs (not placeholder)
- Verify you ran all 3 SQL migrations (especially 003!)
- Check browser console for specific error details  
- Make sure your Supabase project is active (not paused)

**Getting "constraint violation" errors?**
- You probably missed migration 003 - this is required for multi-project support
- Run `supabase/migrations/003_fix_table_constraints.sql` in your SQL Editor

**Need help?**
- Check your Supabase project logs in the dashboard
- Verify tables were created in **Database → Tables** section