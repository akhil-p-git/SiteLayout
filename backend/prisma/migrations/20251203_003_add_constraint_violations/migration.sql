-- Add constraint_violations JSONB column to asset_placements
-- This stores validation constraint violation information
ALTER TABLE "asset_placements" ADD COLUMN "constraint_violations" JSONB;

-- Add comment explaining the constraint_violations structure
COMMENT ON COLUMN "asset_placements"."constraint_violations" IS
'JSON array containing constraint violation objects:
[
  {
    "constraintId": "uuid",
    "constraintName": "string (human readable constraint name)",
    "constraintType": "string (slope_limit, setback_distance, spacing, etc)",
    "severity": "error|warning|info",
    "message": "string (user-friendly message)",
    "details": {
      "currentValue": number,
      "maxAllowed": number,
      "unit": "string"
    }
  }
]';

-- Create GIN index for efficient JSONB containment queries
-- This allows fast filtering on constraint_violations content
CREATE INDEX IF NOT EXISTS "asset_placements_constraint_violations_gin_idx"
ON "asset_placements" USING GIN ("constraint_violations");

-- Create index for querying assets that have violations
CREATE INDEX IF NOT EXISTS "asset_placements_has_violations_idx"
ON "asset_placements" ((("constraint_violations" IS NOT NULL)));

-- Create index for querying by asset type (used with constraint filtering)
CREATE INDEX IF NOT EXISTS "asset_placements_asset_type_constraints_idx"
ON "asset_placements" ("asset_type", (("constraint_violations" IS NOT NULL)));
