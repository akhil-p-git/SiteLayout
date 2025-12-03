-- Add elevation_profile JSONB column to road_segments
-- This stores detailed elevation profile information including grade samples
ALTER TABLE "road_segments" ADD COLUMN "elevation_profile" JSONB;

-- Add comment explaining the elevation_profile structure
COMMENT ON COLUMN "road_segments"."elevation_profile" IS
'JSON structure containing:
{
  "samplingInterval": number (meters between samples),
  "totalLength": number (total segment length),
  "samples": array of {
    "distance": number (cumulative distance along segment),
    "elevation": number (elevation in meters),
    "grade": number (percent grade),
    "lat": number (latitude),
    "lng": number (longitude)
  },
  "stats": {
    "minElevation": number,
    "maxElevation": number,
    "minGrade": number,
    "maxGrade": number,
    "avgGrade": number,
    "elevationGain": number,
    "elevationLoss": number
  }
}';

-- Backfill length column from geometry using ST_Length for geography
UPDATE "road_segments"
SET "length" = ST_Length(ST_Transform("geometry", 4326)::geography) / 1000  -- Convert to km
WHERE "geometry" IS NOT NULL AND "length" IS NULL;

-- Create index for efficient queries on road_segments with grade info
CREATE INDEX IF NOT EXISTS "road_segments_max_grade_idx" ON "road_segments" ("max_grade");

-- Add comment to grade column
COMMENT ON COLUMN "road_segments"."grade" IS 'Array of grade percentages, one per segment vertex';

-- Add comment to max_grade column
COMMENT ON COLUMN "road_segments"."max_grade" IS 'Maximum grade percentage along this road segment';

-- Add comment to avg_grade column
COMMENT ON COLUMN "road_segments"."avg_grade" IS 'Average grade percentage along this road segment';
