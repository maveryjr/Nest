# Supabase Setup Guide for Nest

This guide will help you set up a new Supabase project with all the required database tables, policies, and configurations for the Nest Chrome extension and web dashboard.

## 📋 Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- Access to your Nest monorepo project

## 🚀 Step-by-Step Setup

### 1. Create New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `nest-knowledge-app` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for project initialization (2-3 minutes)

### 2. Run Database Setup SQL

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire content from `supabase-setup.sql` file
4. Paste it into the SQL editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. Verify success - you should see confirmation messages and verification results

### 3. Get Your Project Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **Anon (public) Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 4. Configure Environment Variables

Create a `.env.local` file in the `packages/web-dashboard/` directory:

```bash
cd packages/web-dashboard
cp .env.local.template .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Environment
NODE_ENV=development
```

### 5. Test the Setup

Start the web dashboard:

```bash
yarn dev:web
```

1. Open http://localhost:3000
2. Try signing up with a test email/password
3. Verify you can log in successfully
4. Check that the dashboard loads without errors

## 🔍 Verification

After running the setup SQL, you should have:

### ✅ Tables Created
- `public.links` - For saved bookmarks and content
- `public.collections` - For organizing links into collections
- `public.highlights` - For text highlights and annotations

### ✅ Security Configured
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Proper authentication policies in place

### ✅ Performance Optimized
- Indexes on frequently queried columns
- Full-text search capability
- Optimized for real-time updates

### ✅ User Experience Features
- Default collections created for new users
- Auto-updating timestamps
- Real-time subscriptions enabled

## 🛠️ Troubleshooting

### "Table doesn't exist" errors
- Make sure you ran the complete `supabase-setup.sql` script
- Check the SQL Editor for any error messages
- Verify you're in the correct project

### Authentication issues
- Double-check your environment variables
- Ensure the Supabase URL and key are correct
- Verify `.env.local` is in the correct directory

### Permission errors
- Check that RLS policies were created successfully
- Try signing up with a new account
- Verify the user authentication is working

### Database connection issues
- Confirm your project is fully initialized
- Check the project status in Supabase dashboard
- Try refreshing your project API keys

## 📊 Database Schema Overview

### Links Table
Stores user bookmarks with rich metadata:
- URL, title, favicon, domain
- User notes and AI summaries
- Categories, collections, tags
- Content type (webpage, PDF, video, etc.)
- Reading time, author, publish date

### Collections Table
User-created folders for organizing links:
- Name, description, color, icon
- Public/private visibility
- Associated tags

### Highlights Table
Text selections and annotations:
- Selected text and context
- Position data for recreation
- User notes and tags
- Linked to specific URLs

## 🔧 Advanced Configuration

### Custom Collections
The setup automatically creates default collections for new users:
- Reading List
- Research
- Tutorials
- Inspiration

### Real-time Updates
The database is configured for real-time synchronization between:
- Chrome extension and web dashboard
- Multiple browser tabs
- Collaborative features (future)

### Search Capabilities
Full-text search is enabled across:
- Link titles and descriptions
- User notes and annotations
- Extracted text content

## 🚀 Next Steps

After successful setup:

1. **Test Chrome Extension**: Load the extension and verify it can save links
2. **Explore Features**: Try creating collections, adding highlights, organizing content
3. **Customize**: Modify default collections, adjust settings as needed
4. **Deploy**: Consider setting up production environment variables

## 💡 Tips

- Keep your database password secure
- Regularly backup your data through Supabase dashboard
- Monitor usage in Supabase dashboard to stay within free tier limits
- Use the SQL Editor to run custom queries and analytics

## 📞 Support

If you encounter issues:
1. Check the Supabase dashboard for error logs
2. Verify all environment variables are set correctly
3. Review the SQL execution results for any errors
4. Consult the Supabase documentation for advanced troubleshooting 