-- Add EntryPointType enum
CREATE TYPE "EntryPointType" AS ENUM ('primary', 'secondary', 'emergency', 'maintenance', 'construction');

-- Create entry_points table
CREATE TABLE IF NOT EXISTS "entry_points" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "site_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "type" "EntryPointType" NOT NULL DEFAULT 'primary',
  "capacity" INTEGER,
  "restrictions" JSON,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- PostGIS geometry column for location point
  -- geometry column added separately to support SRID 4326

  CONSTRAINT "entry_points_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "entry_points_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites" ("id") ON DELETE CASCADE
);

-- Create geometry column for entry point location
SELECT AddGeometryColumn('entry_points', 'geometry', 4326, 'POINT', 2);

-- Create spatial index for fast queries
CREATE INDEX "entry_points_geometry_idx" ON "entry_points" USING GIST ("geometry");

-- Create regular indexes for common queries
CREATE INDEX "entry_points_site_id_idx" ON "entry_points" ("site_id");
CREATE INDEX "entry_points_type_idx" ON "entry_points" ("type");

-- Create trigger for updated_at timestamp
CREATE TRIGGER "entry_points_updated_at_trigger"
BEFORE UPDATE ON "entry_points"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Migrate existing entry_points MULTIPOINT data from sites table
-- Extract individual points from MULTIPOINT geometry and create EntryPoint records
INSERT INTO "entry_points" ("site_id", "name", "geometry", "type")
SELECT
  s."id",
  CONCAT('Entry Point ', ROW_NUMBER() OVER (PARTITION BY s."id" ORDER BY (ST_DumpPoints(s."entry_points")).path[1])),
  (ST_DumpPoints(s."entry_points")).geom,
  CASE
    WHEN ROW_NUMBER() OVER (PARTITION BY s."id" ORDER BY (ST_DumpPoints(s."entry_points")).path[1]) = 1 THEN 'primary'::text
    ELSE 'secondary'::text
  END
FROM "sites" s
WHERE s."entry_points" IS NOT NULL AND ST_NPoints(s."entry_points") > 0;

-- Make constraint-checking metadata columns for validation results
-- Note: constraint_violations for assets will be added in migration 3
