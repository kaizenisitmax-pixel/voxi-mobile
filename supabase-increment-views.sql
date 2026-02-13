-- Increment Design View Count RPC Function
-- Run this in Supabase SQL Editor

-- Drop existing function if exists
DROP FUNCTION IF EXISTS increment_design_views(uuid);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_design_views(design_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE designs
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = design_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_design_views(uuid) TO authenticated;

-- Test the function
-- SELECT increment_design_views('your-design-id-here');
-- SELECT view_count FROM designs WHERE id = 'your-design-id-here';
