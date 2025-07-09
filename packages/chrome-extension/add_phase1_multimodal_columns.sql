-- Migration: Add Phase 1 multimodal columns to links table
-- This adds support for universal multimodal capture features

-- Add the missing columns for multimodal content support
ALTER TABLE public.links 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'webpage',
ADD COLUMN IF NOT EXISTS media_attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS video_timestamp INTEGER,
ADD COLUMN IF NOT EXISTS author VARCHAR(255),
ADD COLUMN IF NOT EXISTS publish_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_metadata JSONB;

-- Add comments to document the new columns
COMMENT ON COLUMN public.links.content_type IS 'Type of content: webpage, pdf, video, image, audio, email, social_post, etc.';
COMMENT ON COLUMN public.links.media_attachments IS 'Array of media files (images, videos, audio) attached to this link';
COMMENT ON COLUMN public.links.extracted_text IS 'Text content extracted from PDFs, images (OCR), or audio transcriptions';
COMMENT ON COLUMN public.links.video_timestamp IS 'Timestamp in seconds for video content';
COMMENT ON COLUMN public.links.author IS 'Author or creator of the content';
COMMENT ON COLUMN public.links.publish_date IS 'Original publication date of the content';
COMMENT ON COLUMN public.links.source_metadata IS 'Additional metadata specific to the content source (platform-specific data)';

-- Optional: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_links_content_type ON public.links (content_type);
CREATE INDEX IF NOT EXISTS idx_links_author ON public.links (author);
CREATE INDEX IF NOT EXISTS idx_links_publish_date ON public.links (publish_date);
CREATE INDEX IF NOT EXISTS idx_links_extracted_text ON public.links USING GIN (to_tsvector('english', extracted_text));

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'links' 
AND column_name IN ('content_type', 'media_attachments', 'extracted_text', 'video_timestamp', 'author', 'publish_date', 'source_metadata')
ORDER BY column_name; 