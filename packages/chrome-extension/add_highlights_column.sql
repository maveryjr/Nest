-- Migration: Add highlights column to links table
-- This adds support for storing highlight data as JSONB

ALTER TABLE public.links 
ADD COLUMN highlights JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN public.links.highlights IS 'Stores user highlights and notes for saved links as JSON array';

-- Optional: Add an index for better query performance on highlights
CREATE INDEX idx_links_highlights ON public.links USING GIN (highlights);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'links' AND column_name = 'highlights'; 