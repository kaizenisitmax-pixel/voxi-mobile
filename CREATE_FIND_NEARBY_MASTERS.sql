-- Create find_nearby_masters RPC Function
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- HAVERSINE MESAFE HESAPLAMA FONKSİYONU
-- ============================================
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371; -- km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Derece farkları
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  -- Haversine formülü
  a := SIN(dlat/2) * SIN(dlat/2) + 
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
       SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- YAKIN USTALARI BULMA FONKSİYONU
-- ============================================
CREATE OR REPLACE FUNCTION find_nearby_masters(
  user_lat DECIMAL,
  user_lon DECIMAL,
  max_distance_km INTEGER DEFAULT 50,
  specialty_filter TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  phone TEXT,
  specialties JSONB,
  service_areas JSONB,
  experience_years INTEGER,
  rating DECIMAL,
  total_jobs INTEGER,
  completed_jobs INTEGER,
  bio TEXT,
  profile_image_url TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  location_address TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.name,
    m.phone,
    m.specialties,
    m.service_areas,
    m.experience_years,
    m.rating,
    m.total_jobs,
    m.completed_jobs,
    m.bio,
    m.profile_image_url,
    m.latitude,
    m.longitude,
    m.location_address,
    calculate_distance(user_lat, user_lon, m.latitude, m.longitude) as distance_km
  FROM masters m
  WHERE 
    m.is_active = true
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, m.latitude, m.longitude) <= max_distance_km
    AND (
      specialty_filter IS NULL 
      OR m.specialties @> to_jsonb(ARRAY[specialty_filter])
    )
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TEST: FONKSİYONU ÇALIŞTIR
-- ============================================
-- Örnek: İstanbul merkezden 50 km içindeki ustalar
SELECT * FROM find_nearby_masters(
  41.0082,  -- İstanbul enlem
  28.9784,  -- İstanbul boylam
  50,       -- 50 km radius
  NULL      -- Tüm uzmanlıklar
);

-- Eğer hiç usta yoksa boş sonuç döner (bu normal!)
