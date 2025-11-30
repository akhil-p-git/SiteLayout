-- MVP+ Site Layouts - Initial Migration
-- PostgreSQL with PostGIS extension

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE "ProjectStatus" AS ENUM ('active', 'archived', 'completed');
CREATE TYPE "SiteStatus" AS ENUM ('draft', 'analyzed', 'optimized', 'finalized');
CREATE TYPE "LayoutStatus" AS ENUM ('draft', 'optimized', 'approved', 'rejected');
CREATE TYPE "ExclusionZoneType" AS ENUM ('wetland', 'setback', 'easement', 'environmental', 'custom');
CREATE TYPE "AssetType" AS ENUM ('bess_container', 'bess_array', 'substation', 'om_building', 'parking', 'laydown', 'transformer', 'inverter', 'solar_array', 'custom');
CREATE TYPE "RoadType" AS ENUM ('access', 'internal', 'emergency');
CREATE TYPE "OptimizationObjective" AS ENUM ('min_earthwork', 'max_capacity', 'balanced');
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'analyst', 'viewer');
CREATE TYPE "JobType" AS ENUM ('terrain_analysis', 'optimization', 'export');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role "UserRole" DEFAULT 'viewer',
    external_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status "ProjectStatus" DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);

-- =============================================================================
-- SITE & TERRAIN TABLES
-- =============================================================================

-- Sites (with PostGIS geometry columns)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    address TEXT,
    region VARCHAR(100),
    boundary GEOMETRY(MULTIPOLYGON, 4326),
    boundary_area DOUBLE PRECISION,
    entry_points GEOMETRY(MULTIPOINT, 4326),
    dem_url TEXT,
    dem_resolution DOUBLE PRECISION,
    min_elevation DOUBLE PRECISION,
    max_elevation DOUBLE PRECISION,
    avg_slope DOUBLE PRECISION,
    status "SiteStatus" DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_project ON sites(project_id);
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_sites_boundary ON sites USING GIST(boundary);
CREATE INDEX idx_sites_entry_points ON sites USING GIST(entry_points);

-- Exclusion Zones
CREATE TABLE exclusion_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type "ExclusionZoneType" NOT NULL,
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    buffer DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exclusion_zones_site ON exclusion_zones(site_id);
CREATE INDEX idx_exclusion_zones_geometry ON exclusion_zones USING GIST(geometry);

-- =============================================================================
-- LAYOUT & ASSET TABLES
-- =============================================================================

-- Layouts
CREATE TABLE layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    status "LayoutStatus" DEFAULT 'draft',
    configuration JSONB NOT NULL,
    metrics JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, version)
);

CREATE INDEX idx_layouts_site ON layouts(site_id);
CREATE INDEX idx_layouts_status ON layouts(status);

-- Asset Placements
CREATE TABLE asset_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    asset_type "AssetType" NOT NULL,
    name VARCHAR(255) NOT NULL,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326),
    dimensions JSONB,
    elevation JSONB,
    earthwork JSONB,
    constraints JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_placements_layout ON asset_placements(layout_id);
CREATE INDEX idx_asset_placements_type ON asset_placements(asset_type);
CREATE INDEX idx_asset_placements_geometry ON asset_placements USING GIST(geometry);

-- Road Segments
CREATE TABLE road_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    length DOUBLE PRECISION,
    width DOUBLE PRECISION,
    grade DOUBLE PRECISION[] DEFAULT '{}',
    max_grade DOUBLE PRECISION,
    avg_grade DOUBLE PRECISION,
    earthwork JSONB,
    type "RoadType" DEFAULT 'access',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_road_segments_layout ON road_segments(layout_id);
CREATE INDEX idx_road_segments_geometry ON road_segments USING GIST(geometry);

-- =============================================================================
-- EARTHWORK & CALCULATIONS
-- =============================================================================

-- Earthwork Summaries
CREATE TABLE earthwork_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    layout_id UUID UNIQUE NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    components JSONB NOT NULL,
    totals JSONB NOT NULL,
    costs JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earthwork_summaries_layout ON earthwork_summaries(layout_id);

-- =============================================================================
-- JOBS & ASYNC PROCESSING
-- =============================================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type "JobType" NOT NULL,
    status "JobStatus" DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    input JSONB,
    result JSONB,
    error TEXT,
    entity_type VARCHAR(100),
    entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_type_status ON jobs(type, status);
CREATE INDEX idx_jobs_entity ON jobs(entity_type, entity_id);

-- =============================================================================
-- AUDIT & LOGGING
-- =============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_layouts_updated_at
    BEFORE UPDATE ON layouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
