-- Nest Chrome Extension & Web Dashboard Database Setup
-- Run this in your Supabase SQL Editor to set up all required tables and policies

-- Enable Row Level Security (RLS) for all tables
SET statement_timeout = '10min';

-- =====================================================
-- 1. LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic link information
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  favicon TEXT,
  domain TEXT,
  user_note TEXT DEFAULT '',
  ai_summary TEXT,
  
  -- Organization
  category TEXT DEFAULT 'Uncategorized',
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  is_in_inbox BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  
  -- Content metadata
  reading_time INTEGER DEFAULT 0,
  content_type VARCHAR(50) DEFAULT 'webpage',
  media_attachments JSONB DEFAULT '[]'::jsonb,
  extracted_text TEXT,
  video_timestamp INTEGER,
  author VARCHAR(255),
  publish_date TIMESTAMPTZ,
  source_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE public.links IS 'User saved links with metadata and organization';
COMMENT ON COLUMN public.links.content_type IS 'Type of content: webpage, pdf, video, image, audio, email, social_post, etc.';
COMMENT ON COLUMN public.links.media_attachments IS 'Array of media files (images, videos, audio) attached to this link';
COMMENT ON COLUMN public.links.extracted_text IS 'Text content extracted from PDFs, images (OCR), or audio transcriptions';
COMMENT ON COLUMN public.links.video_timestamp IS 'Timestamp in seconds for video content';
COMMENT ON COLUMN public.links.author IS 'Author or creator of the content';
COMMENT ON COLUMN public.links.publish_date IS 'Original publication date of the content';
COMMENT ON COLUMN public.links.source_metadata IS 'Additional metadata specific to the content source (platform-specific data)';

-- =====================================================
-- 2. COLLECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Collection details
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color VARCHAR(20) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'folder',
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.collections IS 'User-created collections for organizing links';

-- =====================================================
-- 3. HIGHLIGHTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
  
  -- Highlight content
  selected_text TEXT NOT NULL,
  context TEXT,
  position JSONB DEFAULT '{}'::jsonb,
  user_note TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.highlights IS 'Text highlights saved from web pages';
COMMENT ON COLUMN public.highlights.position IS 'JSON object containing position data for recreating highlights';

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Links table indexes
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links (user_id);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_category ON public.links (category);
CREATE INDEX IF NOT EXISTS idx_links_collection_id ON public.links (collection_id);
CREATE INDEX IF NOT EXISTS idx_links_is_in_inbox ON public.links (is_in_inbox);
CREATE INDEX IF NOT EXISTS idx_links_domain ON public.links (domain);
CREATE INDEX IF NOT EXISTS idx_links_content_type ON public.links (content_type);
CREATE INDEX IF NOT EXISTS idx_links_author ON public.links (author);
CREATE INDEX IF NOT EXISTS idx_links_publish_date ON public.links (publish_date);
CREATE INDEX IF NOT EXISTS idx_links_tags ON public.links USING GIN (tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_links_search ON public.links USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(user_note, '') || ' ' || COALESCE(extracted_text, ''))
);

-- Collections table indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_name ON public.collections (name);

-- Highlights table indexes
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights (user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_link_id ON public.highlights (link_id);
CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON public.highlights (created_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

-- Links RLS policies
CREATE POLICY "Users can view their own links" ON public.links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links" ON public.links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" ON public.links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON public.links
  FOR DELETE USING (auth.uid() = user_id);

-- Collections RLS policies
CREATE POLICY "Users can view their own collections" ON public.collections
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own collections" ON public.collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON public.collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON public.collections
  FOR DELETE USING (auth.uid() = user_id);

-- Highlights RLS policies
CREATE POLICY "Users can view their own highlights" ON public.highlights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own highlights" ON public.highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights" ON public.highlights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights" ON public.highlights
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 6. UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_links_updated_at 
  BEFORE UPDATE ON public.links 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at 
  BEFORE UPDATE ON public.collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_highlights_updated_at 
  BEFORE UPDATE ON public.highlights 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to create default collections for new users
CREATE OR REPLACE FUNCTION create_default_collections_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default collections
  INSERT INTO public.collections (user_id, name, description, color, icon)
  VALUES 
    (NEW.id, 'Reading List', 'Articles and content to read later', '#3B82F6', 'book-open'),
    (NEW.id, 'Research', 'Research materials and references', '#10B981', 'search'),
    (NEW.id, 'Tutorials', 'How-to guides and learning resources', '#F59E0B', 'graduation-cap'),
    (NEW.id, 'Inspiration', 'Creative ideas and inspiration', '#EF4444', 'lightbulb');
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create default collections when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_collections_for_user();

-- =====================================================
-- 8. REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.highlights;

-- =====================================================
-- 9. SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Uncomment the following to add sample data for testing
/*
-- Sample collections (replace 'your-user-id' with actual user ID)
INSERT INTO public.collections (user_id, name, description, color, icon) VALUES
('your-user-id', 'AI & Machine Learning', 'Latest developments in AI/ML', '#8B5CF6', 'cpu'),
('your-user-id', 'Web Development', 'Frontend and backend resources', '#06B6D4', 'code');

-- Sample links (replace 'your-user-id' with actual user ID)  
INSERT INTO public.links (user_id, url, title, domain, category, tags, reading_time) VALUES
('your-user-id', 'https://openai.com/blog/chatgpt', 'Introducing ChatGPT', 'openai.com', 'AI', '{"AI", "ChatGPT"}', 5),
('your-user-id', 'https://react.dev', 'React Documentation', 'react.dev', 'Development', '{"React", "Documentation"}', 10);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables were created successfully
SELECT 
  table_name, 
  table_type,
  is_insertable_into
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('links', 'collections', 'highlights')
ORDER BY table_name;

-- Verify RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('links', 'collections', 'highlights');

-- Check column structure for links table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'links' 
AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT; 