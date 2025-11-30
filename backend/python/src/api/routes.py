"""
API Routes

FastAPI routes for DEM processing and terrain analysis.
"""

import os
import tempfile
import uuid
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..parsers import parse_dxf, get_dxf_info, ContourSet
from ..terrain import (
    DEMConfig,
    DEMResult,
    generate_dem_from_contours,
    generate_dem_from_points,
    save_dem_as_geotiff,
    load_dem_from_geotiff,
    SlopeUnit,
    calculate_slope,
    calculate_aspect,
    classify_slope,
    calculate_terrain_metrics,
    generate_slope_visualization,
    generate_aspect_visualization,
    identify_steep_areas,
    save_slope_as_geotiff,
    save_aspect_as_geotiff,
)


# Configuration
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))


# Pydantic models
class DEMConfigRequest(BaseModel):
    """Request model for DEM configuration."""

    resolution: float = Field(default=1.0, ge=0.1, le=100.0, description="Pixel size in CRS units")
    crs: str = Field(default="EPSG:4326", description="Coordinate reference system")
    interpolation_method: Literal["linear", "nearest"] = Field(
        default="linear",
        description="Interpolation method"
    )
    sample_interval: float = Field(
        default=10.0,
        ge=0.1,
        le=100.0,
        description="Distance between contour sample points"
    )
    buffer: float = Field(default=0.0, ge=0, description="Buffer around bounds")
    create_cog: bool = Field(default=True, description="Create Cloud Optimized GeoTIFF")


class DEMStatsResponse(BaseModel):
    """Response model for DEM statistics."""

    valid_pixels: int
    total_pixels: int
    min_elevation: float
    max_elevation: float
    mean_elevation: float
    std_elevation: float
    resolution: float
    width: int
    height: int
    bounds: tuple[float, float, float, float]


class DXFInfoResponse(BaseModel):
    """Response model for DXF file information."""

    filepath: str
    version: str
    layers: list[str]
    entity_counts: dict[str, int]
    units: int | None


class ContourSetResponse(BaseModel):
    """Response model for parsed contours."""

    contour_count: int
    min_elevation: float
    max_elevation: float
    contour_interval: float | None
    bounds: tuple[float, float, float, float]
    layers: list[str]


class DEMGenerationResponse(BaseModel):
    """Response model for DEM generation."""

    success: bool
    dem_id: str
    filepath: str
    stats: DEMStatsResponse
    message: str


class ElevationQueryRequest(BaseModel):
    """Request model for elevation query."""

    x: float = Field(description="X coordinate (longitude or easting)")
    y: float = Field(description="Y coordinate (latitude or northing)")


class ElevationQueryResponse(BaseModel):
    """Response model for elevation query."""

    x: float
    y: float
    elevation: float | None
    unit: str = "meters"


# Router
dem_router = APIRouter()


@dem_router.post("/dxf/info", response_model=DXFInfoResponse)
async def get_dxf_file_info(
    file: Annotated[UploadFile, File(description="DXF contour file")]
) -> DXFInfoResponse:
    """
    Get information about a DXF file without full parsing.

    Returns basic metadata including layers, entity counts, and version.
    """
    if not file.filename or not file.filename.lower().endswith('.dxf'):
        raise HTTPException(status_code=400, detail="File must be a DXF file")

    # Save uploaded file temporarily
    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}.dxf"
    try:
        content = await file.read()
        temp_path.write_bytes(content)

        info = get_dxf_info(temp_path)
        return DXFInfoResponse(**info)
    finally:
        if temp_path.exists():
            temp_path.unlink()


@dem_router.post("/dxf/parse", response_model=ContourSetResponse)
async def parse_dxf_contours(
    file: Annotated[UploadFile, File(description="DXF contour file")],
    layers: Annotated[str | None, Form(description="Comma-separated layer names to include")] = None,
) -> ContourSetResponse:
    """
    Parse a DXF file and extract contour information.

    Extracts elevation data from contour lines and returns metadata.
    """
    if not file.filename or not file.filename.lower().endswith('.dxf'):
        raise HTTPException(status_code=400, detail="File must be a DXF file")

    # Save uploaded file temporarily
    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}.dxf"
    try:
        content = await file.read()
        temp_path.write_bytes(content)

        layer_filter = layers.split(",") if layers else None
        contour_set = parse_dxf(temp_path, layer_filter=layer_filter)

        # Get unique layers
        unique_layers = list(set(c.layer for c in contour_set.contours))

        return ContourSetResponse(
            contour_count=len(contour_set.contours),
            min_elevation=contour_set.min_elevation,
            max_elevation=contour_set.max_elevation,
            contour_interval=contour_set.contour_interval,
            bounds=contour_set.bounds,
            layers=unique_layers,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse DXF: {str(e)}")
    finally:
        if temp_path.exists():
            temp_path.unlink()


@dem_router.post("/dem/generate", response_model=DEMGenerationResponse)
async def generate_dem(
    file: Annotated[UploadFile, File(description="DXF contour file or GeoTIFF DEM")],
    resolution: Annotated[float, Form(description="Output resolution")] = 1.0,
    crs: Annotated[str, Form(description="Coordinate reference system")] = "EPSG:4326",
    interpolation: Annotated[str, Form(description="Interpolation method")] = "linear",
    sample_interval: Annotated[float, Form(description="Contour sample interval")] = 10.0,
    buffer: Annotated[float, Form(description="Buffer around bounds")] = 0.0,
    create_cog: Annotated[bool, Form(description="Create Cloud Optimized GeoTIFF")] = True,
) -> DEMGenerationResponse:
    """
    Generate a DEM from a DXF contour file.

    Parses the DXF file, extracts contours, and generates a DEM using
    TIN interpolation. The result is saved as a Cloud Optimized GeoTIFF.
    """
    filename = file.filename or "upload"

    if not (filename.lower().endswith('.dxf') or
            filename.lower().endswith('.tif') or
            filename.lower().endswith('.tiff')):
        raise HTTPException(
            status_code=400,
            detail="File must be a DXF or GeoTIFF file"
        )

    # Generate unique ID for this DEM
    dem_id = str(uuid.uuid4())
    temp_path = UPLOAD_DIR / f"{dem_id}{Path(filename).suffix}"
    output_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    try:
        # Save uploaded file
        content = await file.read()
        temp_path.write_bytes(content)

        if filename.lower().endswith('.dxf'):
            # Parse DXF and generate DEM
            contour_set = parse_dxf(temp_path)

            config = DEMConfig(
                resolution=resolution,
                crs=crs,
                interpolation_method=interpolation if interpolation in ["linear", "nearest"] else "linear",
                sample_interval=sample_interval,
                buffer=buffer,
            )

            dem_result = generate_dem_from_contours(contour_set, config)
        else:
            # Load existing GeoTIFF
            dem_result = load_dem_from_geotiff(temp_path)

        # Save as GeoTIFF
        save_dem_as_geotiff(dem_result, output_path, create_cog=create_cog)

        stats = dem_result.get_statistics()

        return DEMGenerationResponse(
            success=True,
            dem_id=dem_id,
            filepath=str(output_path),
            stats=DEMStatsResponse(
                **stats,
                width=dem_result.width,
                height=dem_result.height,
                bounds=dem_result.bounds,
            ),
            message=f"DEM generated successfully with {stats['valid_pixels']} valid pixels",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Clean up output file on error
        if output_path.exists():
            output_path.unlink()
        raise HTTPException(status_code=500, detail=f"DEM generation failed: {str(e)}")
    finally:
        # Clean up input file
        if temp_path.exists():
            temp_path.unlink()


@dem_router.get("/dem/{dem_id}")
async def get_dem(dem_id: str) -> FileResponse:
    """
    Download a generated DEM file.

    Returns the GeoTIFF file for the specified DEM ID.
    """
    output_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    return FileResponse(
        path=output_path,
        media_type="image/tiff",
        filename=f"{dem_id}_dem.tif",
    )


@dem_router.get("/dem/{dem_id}/stats", response_model=DEMStatsResponse)
async def get_dem_stats(dem_id: str) -> DEMStatsResponse:
    """
    Get statistics for a generated DEM.

    Returns elevation statistics and metadata.
    """
    output_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    dem_result = load_dem_from_geotiff(output_path)
    stats = dem_result.get_statistics()

    return DEMStatsResponse(
        **stats,
        width=dem_result.width,
        height=dem_result.height,
        bounds=dem_result.bounds,
    )


@dem_router.post("/dem/{dem_id}/elevation", response_model=ElevationQueryResponse)
async def query_elevation(dem_id: str, query: ElevationQueryRequest) -> ElevationQueryResponse:
    """
    Query elevation at a specific coordinate.

    Returns the elevation value at the given X, Y coordinate.
    """
    output_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    dem_result = load_dem_from_geotiff(output_path)
    elevation = dem_result.get_elevation_at(query.x, query.y)

    return ElevationQueryResponse(
        x=query.x,
        y=query.y,
        elevation=elevation,
        unit="meters",
    )


@dem_router.delete("/dem/{dem_id}")
async def delete_dem(dem_id: str) -> dict:
    """
    Delete a generated DEM file.

    Removes the DEM file from storage.
    """
    output_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    output_path.unlink()

    return {"success": True, "message": f"DEM {dem_id} deleted"}


# ============================================================================
# Terrain Analysis Endpoints
# ============================================================================

class SlopeResponse(BaseModel):
    """Response model for slope analysis."""
    slope_id: str
    min_slope: float
    max_slope: float
    mean_slope: float
    unit: str
    filepath: str


class AspectResponse(BaseModel):
    """Response model for aspect analysis."""
    aspect_id: str
    distribution: dict[str, float]
    dominant_direction: str
    filepath: str


class SlopeClassDistribution(BaseModel):
    """Slope class distribution."""
    class_name: str
    percentage: float
    buildable: bool


class ClassifiedSlopeResponse(BaseModel):
    """Response model for classified slope."""
    slope_id: str
    buildable_percent: float
    class_distribution: list[SlopeClassDistribution]
    filepath: str


class TerrainMetricsResponse(BaseModel):
    """Response model for terrain metrics."""
    min_elevation: float
    max_elevation: float
    mean_elevation: float
    elevation_range: float
    std_elevation: float
    min_slope: float
    max_slope: float
    mean_slope: float
    std_slope: float
    dominant_aspect: str
    aspect_distribution: dict[str, float]
    buildable_area_percent: float
    slope_class_distribution: dict[str, float]


class SteepAreasResponse(BaseModel):
    """Response model for steep areas identification."""
    threshold: float
    steep_pixel_count: int
    steep_area_percent: float
    total_pixels: int


@dem_router.get("/dem/{dem_id}/slope", response_model=SlopeResponse)
async def analyze_slope(
    dem_id: str,
    unit: str = "degrees",
) -> SlopeResponse:
    """
    Calculate slope from a DEM.

    Args:
        dem_id: DEM identifier
        unit: Output unit (degrees, percent, or ratio)

    Returns slope statistics and saves slope raster.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        # Load DEM
        dem = load_dem_from_geotiff(dem_path)

        # Calculate slope
        slope_unit = SlopeUnit(unit) if unit in ["degrees", "percent", "ratio"] else SlopeUnit.DEGREES
        slope = calculate_slope(dem, slope_unit)

        # Save slope raster
        slope_id = f"{dem_id}_slope"
        slope_path = OUTPUT_DIR / f"{slope_id}.tif"
        save_slope_as_geotiff(slope, slope_path)

        return SlopeResponse(
            slope_id=slope_id,
            min_slope=slope.min_slope,
            max_slope=slope.max_slope,
            mean_slope=slope.mean_slope,
            unit=slope.unit.value,
            filepath=str(slope_path),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slope analysis failed: {str(e)}")


@dem_router.get("/dem/{dem_id}/aspect", response_model=AspectResponse)
async def analyze_aspect(dem_id: str) -> AspectResponse:
    """
    Calculate aspect (slope direction) from a DEM.

    Returns aspect distribution and saves aspect raster.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)
        aspect = calculate_aspect(dem)

        # Save aspect raster
        aspect_id = f"{dem_id}_aspect"
        aspect_path = OUTPUT_DIR / f"{aspect_id}.tif"
        save_aspect_as_geotiff(aspect, aspect_path)

        # Find dominant direction (excluding Flat)
        dominant = max(
            [(k, v) for k, v in aspect.distribution.items() if k != "Flat"],
            key=lambda x: x[1],
            default=("N", 0)
        )

        return AspectResponse(
            aspect_id=aspect_id,
            distribution=aspect.distribution,
            dominant_direction=dominant[0],
            filepath=str(aspect_path),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aspect analysis failed: {str(e)}")


@dem_router.get("/dem/{dem_id}/slope/classify", response_model=ClassifiedSlopeResponse)
async def classify_dem_slope(
    dem_id: str,
    threshold_1: float = 3.0,
    threshold_2: float = 5.0,
    threshold_3: float = 10.0,
    threshold_4: float = 15.0,
) -> ClassifiedSlopeResponse:
    """
    Classify slope into discrete categories.

    Uses configurable thresholds for classification.
    Default thresholds: 0-3% (Flat), 3-5% (Gentle), 5-10% (Moderate),
    10-15% (Steep), >15% (Very Steep).
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        from ..terrain import SlopeClassBreakpoint

        dem = load_dem_from_geotiff(dem_path)
        slope = calculate_slope(dem, SlopeUnit.DEGREES)

        # Create custom classes from thresholds
        classes = [
            SlopeClassBreakpoint(max_slope=threshold_1, label=f"Flat (0-{threshold_1}%)", color=(0, 128, 0), buildable=True),
            SlopeClassBreakpoint(max_slope=threshold_2, label=f"Gentle ({threshold_1}-{threshold_2}%)", color=(144, 238, 144), buildable=True),
            SlopeClassBreakpoint(max_slope=threshold_3, label=f"Moderate ({threshold_2}-{threshold_3}%)", color=(255, 255, 0), buildable=True),
            SlopeClassBreakpoint(max_slope=threshold_4, label=f"Steep ({threshold_3}-{threshold_4}%)", color=(255, 165, 0), buildable=False),
            SlopeClassBreakpoint(max_slope=float('inf'), label=f"Very Steep (>{threshold_4}%)", color=(255, 0, 0), buildable=False),
        ]

        classified = classify_slope(slope, classes)

        # Save visualization
        slope_id = f"{dem_id}_slope_classified"
        viz_path = OUTPUT_DIR / f"{slope_id}.png"
        generate_slope_visualization(classified, viz_path)

        # Build distribution list
        distribution = [
            SlopeClassDistribution(
                class_name=cls.label,
                percentage=classified.class_distribution.get(cls.label, 0.0),
                buildable=cls.buildable,
            )
            for cls in classes
        ]

        return ClassifiedSlopeResponse(
            slope_id=slope_id,
            buildable_percent=classified.buildable_percent,
            class_distribution=distribution,
            filepath=str(viz_path),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slope classification failed: {str(e)}")


@dem_router.get("/dem/{dem_id}/metrics", response_model=TerrainMetricsResponse)
async def get_terrain_metrics(dem_id: str) -> TerrainMetricsResponse:
    """
    Get comprehensive terrain metrics for a DEM.

    Returns elevation, slope, aspect, and buildability statistics.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)
        metrics = calculate_terrain_metrics(dem)

        return TerrainMetricsResponse(
            min_elevation=metrics.min_elevation,
            max_elevation=metrics.max_elevation,
            mean_elevation=metrics.mean_elevation,
            elevation_range=metrics.elevation_range,
            std_elevation=metrics.std_elevation,
            min_slope=metrics.min_slope,
            max_slope=metrics.max_slope,
            mean_slope=metrics.mean_slope,
            std_slope=metrics.std_slope,
            dominant_aspect=metrics.dominant_aspect,
            aspect_distribution=metrics.aspect_distribution,
            buildable_area_percent=metrics.buildable_area_percent,
            slope_class_distribution=metrics.slope_class_distribution,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics calculation failed: {str(e)}")


@dem_router.get("/dem/{dem_id}/steep-areas", response_model=SteepAreasResponse)
async def identify_dem_steep_areas(
    dem_id: str,
    threshold: float = 15.0,
) -> SteepAreasResponse:
    """
    Identify areas exceeding a slope threshold.

    Args:
        dem_id: DEM identifier
        threshold: Slope threshold in degrees (default 15)
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)
        slope = calculate_slope(dem, SlopeUnit.DEGREES)

        steep_mask = identify_steep_areas(slope, threshold)
        steep_count = int(steep_mask.sum())
        total_valid = int((slope.data != slope.nodata_value).sum())

        return SteepAreasResponse(
            threshold=threshold,
            steep_pixel_count=steep_count,
            steep_area_percent=float(steep_count / total_valid * 100) if total_valid > 0 else 0.0,
            total_pixels=total_valid,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Steep area identification failed: {str(e)}")


@dem_router.get("/dem/{dem_id}/slope/visualization")
async def get_slope_visualization(
    dem_id: str,
    unit: str = "degrees",
) -> FileResponse:
    """
    Get a color-coded slope visualization.

    Returns a PNG image of the slope analysis.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)
        slope_unit = SlopeUnit(unit) if unit in ["degrees", "percent", "ratio"] else SlopeUnit.DEGREES
        slope = calculate_slope(dem, slope_unit)

        viz_path = OUTPUT_DIR / f"{dem_id}_slope_viz.png"
        generate_slope_visualization(slope, viz_path)

        return FileResponse(
            path=viz_path,
            media_type="image/png",
            filename=f"{dem_id}_slope.png",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visualization failed: {str(e)}")


@dem_router.get("/dem/{dem_id}/aspect/visualization")
async def get_aspect_visualization(dem_id: str) -> FileResponse:
    """
    Get a color-coded aspect visualization.

    Returns a PNG image of the aspect analysis.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)
        aspect = calculate_aspect(dem)

        viz_path = OUTPUT_DIR / f"{dem_id}_aspect_viz.png"
        generate_aspect_visualization(aspect, viz_path)

        return FileResponse(
            path=viz_path,
            media_type="image/png",
            filename=f"{dem_id}_aspect.png",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visualization failed: {str(e)}")


# ============================================================================
# Layout Optimization Endpoints
# ============================================================================

from ..optimization import (
    optimize_layout,
    AssetType,
    OptimizationObjective,
    DEFAULT_ASSET_DEFINITIONS,
)


class AssetToPlace(BaseModel):
    """Asset to place in optimization."""
    type: str = Field(description="Asset type (bess, substation, o_and_m, parking, laydown)")
    quantity: int = Field(default=1, ge=1, description="Number of assets to place")


class OptimizationRequest(BaseModel):
    """Request model for layout optimization."""
    site_boundary: dict = Field(description="GeoJSON polygon of site boundary")
    exclusion_zones: list[dict] | None = Field(
        default=None,
        description="List of GeoJSON polygons for exclusion zones"
    )
    assets_to_place: list[AssetToPlace] | None = Field(
        default=None,
        description="Assets to place (uses defaults if not specified)"
    )
    objective: str = Field(
        default="balanced",
        description="Optimization objective: min_earthwork, max_capacity, balanced, min_cable_length"
    )
    population_size: int = Field(default=50, ge=10, le=500, description="GA population size")
    generations: int = Field(default=100, ge=10, le=1000, description="Number of generations")
    generate_alternatives: int = Field(default=3, ge=0, le=10, description="Number of alternative layouts")
    dem_id: str | None = Field(default=None, description="DEM ID for slope data (optional)")


class PlacedAssetResponse(BaseModel):
    """Placed asset in result."""
    asset_id: str
    asset_type: str
    name: str
    position: dict
    rotation: float
    dimensions: dict
    footprint: dict | None


class LayoutSolutionResponse(BaseModel):
    """Layout solution in result."""
    solution_id: str
    placed_assets: list[PlacedAssetResponse]
    fitness_score: float
    objective_scores: dict
    constraint_violations: list[str]
    is_valid: bool
    generation: int
    computation_time_ms: float
    statistics: dict


class OptimizationResponse(BaseModel):
    """Response model for optimization."""
    best_solution: LayoutSolutionResponse
    alternative_solutions: list[LayoutSolutionResponse]
    convergence_history: list[float]
    total_generations: int
    total_time_ms: float
    config: dict


class AssetTypeInfo(BaseModel):
    """Asset type information."""
    type: str
    name: str
    dimensions: dict
    default_quantity: int
    priority: int


# Optimization router
optimization_router = APIRouter()


@optimization_router.get("/asset-types", response_model=list[AssetTypeInfo])
async def get_asset_types() -> list[AssetTypeInfo]:
    """
    Get available asset types for optimization.

    Returns list of asset types with their default configurations.
    """
    asset_types = []
    for asset_type, definition in DEFAULT_ASSET_DEFINITIONS.items():
        asset_types.append(AssetTypeInfo(
            type=asset_type.value,
            name=definition.name,
            dimensions={
                "width": definition.dimensions.width,
                "length": definition.dimensions.length,
                "height": definition.dimensions.height,
            },
            default_quantity=definition.quantity,
            priority=definition.priority,
        ))
    return asset_types


@optimization_router.get("/objectives")
async def get_optimization_objectives() -> list[dict]:
    """
    Get available optimization objectives.

    Returns list of objective types with descriptions.
    """
    return [
        {
            "value": OptimizationObjective.MIN_EARTHWORK.value,
            "label": "Minimize Earthwork",
            "description": "Minimize grading and cut/fill requirements",
        },
        {
            "value": OptimizationObjective.MAX_CAPACITY.value,
            "label": "Maximize Capacity",
            "description": "Maximize placement of all required assets",
        },
        {
            "value": OptimizationObjective.BALANCED.value,
            "label": "Balanced",
            "description": "Balance multiple objectives (earthwork, cable length, roads)",
        },
        {
            "value": OptimizationObjective.MIN_CABLE_LENGTH.value,
            "label": "Minimize Cable Length",
            "description": "Minimize electrical cable runs to substation",
        },
        {
            "value": OptimizationObjective.MIN_ROAD_LENGTH.value,
            "label": "Minimize Road Length",
            "description": "Minimize access road length",
        },
    ]


@optimization_router.post("/optimize", response_model=OptimizationResponse)
async def run_optimization(request: OptimizationRequest) -> OptimizationResponse:
    """
    Run layout optimization for asset placement.

    Uses a genetic algorithm to find optimal asset placements
    that satisfy constraints and optimize the specified objective.
    """
    import numpy as np

    try:
        # Load slope data if DEM ID provided
        slope_data = None
        if request.dem_id:
            dem_path = OUTPUT_DIR / f"{request.dem_id}_dem.tif"
            if dem_path.exists():
                dem = load_dem_from_geotiff(dem_path)
                slope = calculate_slope(dem, SlopeUnit.DEGREES)
                slope_data = slope.data

        # Convert assets to place
        assets_to_place = None
        if request.assets_to_place:
            assets_to_place = [
                {"type": a.type, "quantity": a.quantity}
                for a in request.assets_to_place
            ]

        # Build config
        config = {
            "objective": request.objective,
            "population_size": request.population_size,
            "generations": request.generations,
            "generate_alternatives": request.generate_alternatives,
        }

        # Run optimization
        result = optimize_layout(
            site_boundary=request.site_boundary,
            exclusion_zones=request.exclusion_zones,
            assets_to_place=assets_to_place,
            slope_data=slope_data,
            config=config,
        )

        # Convert to response model
        def convert_solution(sol: dict) -> LayoutSolutionResponse:
            return LayoutSolutionResponse(
                solution_id=sol["solution_id"],
                placed_assets=[
                    PlacedAssetResponse(
                        asset_id=a["asset_id"],
                        asset_type=a["asset_type"],
                        name=a["name"],
                        position=a["position"],
                        rotation=a["rotation"],
                        dimensions=a["dimensions"],
                        footprint=a["footprint"],
                    )
                    for a in sol["placed_assets"]
                ],
                fitness_score=sol["fitness_score"],
                objective_scores=sol["objective_scores"],
                constraint_violations=sol["constraint_violations"],
                is_valid=sol["is_valid"],
                generation=sol["generation"],
                computation_time_ms=sol["computation_time_ms"],
                statistics=sol["statistics"],
            )

        return OptimizationResponse(
            best_solution=convert_solution(result["best_solution"]),
            alternative_solutions=[
                convert_solution(s) for s in result["alternative_solutions"]
            ],
            convergence_history=result["convergence_history"],
            total_generations=result["total_generations"],
            total_time_ms=result["total_time_ms"],
            config=result["config"],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


# ============================================================================
# Road Network Generation Endpoints
# ============================================================================

from ..roads import (
    generate_road_network,
    PathfindingConfig,
)


class RoadDestination(BaseModel):
    """Destination point for road network."""
    x: float = Field(description="X coordinate (longitude)")
    y: float = Field(description="Y coordinate (latitude)")
    name: str = Field(default="", description="Optional name for the destination")
    priority: int = Field(default=1, ge=1, le=10, description="Connection priority (1=highest)")


class RoadNetworkRequest(BaseModel):
    """Request model for road network generation."""
    site_boundary: dict = Field(description="GeoJSON polygon of site boundary")
    entry_point: dict = Field(description="Entry point coordinates {x, y}")
    destinations: list[RoadDestination] = Field(description="Destination points to connect")
    exclusion_zones: list[dict] | None = Field(
        default=None,
        description="List of GeoJSON polygons for exclusion zones"
    )
    dem_id: str | None = Field(
        default=None,
        description="DEM ID for terrain-aware routing (optional)"
    )
    road_width: float = Field(default=6.0, ge=3.0, le=20.0, description="Road width in meters")
    max_gradient: float = Field(default=10.0, ge=1.0, le=25.0, description="Maximum road gradient in percent")
    grid_resolution: float = Field(default=5.0, ge=1.0, le=50.0, description="Pathfinding grid resolution in meters")
    smoothing_iterations: int = Field(default=3, ge=0, le=10, description="Path smoothing iterations")


class RoadSegmentResponse(BaseModel):
    """Road segment in response."""
    start: dict
    end: dict
    length: float
    gradient: float
    is_valid: bool


class RoadPathResponse(BaseModel):
    """Road path in response."""
    destination_name: str
    segments: list[RoadSegmentResponse]
    total_length: float
    max_gradient: float
    average_gradient: float
    is_complete: bool
    geojson: dict | None


class RoadNetworkResponse(BaseModel):
    """Response model for road network generation."""
    success: bool
    entry_point: dict
    paths: list[RoadPathResponse]
    total_road_length: float
    max_gradient_in_network: float
    geojson: dict
    statistics: dict


# Roads router
roads_router = APIRouter()


@roads_router.post("/generate", response_model=RoadNetworkResponse)
async def generate_roads(request: RoadNetworkRequest) -> RoadNetworkResponse:
    """
    Generate a road network connecting entry point to destinations.

    Uses A* pathfinding with terrain-aware cost function to generate
    optimal road paths that respect gradient constraints and avoid
    exclusion zones.
    """
    import numpy as np

    try:
        # Load slope data if DEM ID provided
        slope_data = None
        slope_bounds = None
        slope_resolution = request.grid_resolution

        if request.dem_id:
            dem_path = OUTPUT_DIR / f"{request.dem_id}_dem.tif"
            if dem_path.exists():
                dem = load_dem_from_geotiff(dem_path)
                slope = calculate_slope(dem, SlopeUnit.DEGREES)
                slope_data = slope.data
                slope_bounds = dem.bounds
                slope_resolution = dem.resolution

        # Convert destinations to tuples
        destinations = [
            (d.x, d.y)
            for d in sorted(request.destinations, key=lambda x: x.priority)
        ]
        destination_names = [
            d.name or f"Destination {i+1}"
            for i, d in enumerate(sorted(request.destinations, key=lambda x: x.priority))
        ]

        # Build config
        config = {
            "road_width": request.road_width,
            "max_gradient": request.max_gradient,
            "grid_resolution": request.grid_resolution,
            "smoothing_iterations": request.smoothing_iterations,
        }

        # Generate road network
        result = generate_road_network(
            boundary=request.site_boundary,
            entry_point=(request.entry_point.get("x", 0), request.entry_point.get("y", 0)),
            destinations=destinations,
            exclusion_zones=request.exclusion_zones,
            slope_data=slope_data,
            slope_bounds=slope_bounds,
            slope_resolution=slope_resolution,
            config=config,
        )

        # Convert to response format
        paths = []
        for i, path in enumerate(result.get("paths", [])):
            segments = []
            for seg in path.get("segments", []):
                segments.append(RoadSegmentResponse(
                    start={"x": seg["start"][0], "y": seg["start"][1]},
                    end={"x": seg["end"][0], "y": seg["end"][1]},
                    length=seg["length"],
                    gradient=seg["gradient"],
                    is_valid=seg["is_valid"],
                ))

            paths.append(RoadPathResponse(
                destination_name=destination_names[i] if i < len(destination_names) else f"Path {i+1}",
                segments=segments,
                total_length=path.get("total_length", 0),
                max_gradient=path.get("max_gradient", 0),
                average_gradient=path.get("average_gradient", 0),
                is_complete=path.get("is_complete", False),
                geojson=path.get("geojson"),
            ))

        return RoadNetworkResponse(
            success=result.get("success", False),
            entry_point=request.entry_point,
            paths=paths,
            total_road_length=result.get("total_road_length", 0),
            max_gradient_in_network=result.get("max_gradient_in_network", 0),
            geojson=result.get("geojson", {"type": "FeatureCollection", "features": []}),
            statistics=result.get("statistics", {}),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Road network generation failed: {str(e)}")


@roads_router.post("/validate-gradient")
async def validate_road_gradient(
    path_points: list[dict],
    dem_id: str,
    max_gradient: float = 10.0,
) -> dict:
    """
    Validate gradient along a proposed road path.

    Takes a list of path points and checks if the gradient
    between consecutive points exceeds the maximum allowed.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"

    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)

        violations = []
        max_found_gradient = 0.0

        for i in range(len(path_points) - 1):
            p1 = path_points[i]
            p2 = path_points[i + 1]

            # Get elevations
            elev1 = dem.get_elevation_at(p1["x"], p1["y"])
            elev2 = dem.get_elevation_at(p2["x"], p2["y"])

            if elev1 is None or elev2 is None:
                continue

            # Calculate distance (approximate, in meters)
            import math
            dx = (p2["x"] - p1["x"]) * 111000  # degrees to meters approx
            dy = (p2["y"] - p1["y"]) * 111000
            distance = math.sqrt(dx * dx + dy * dy)

            if distance < 0.001:
                continue

            # Calculate gradient percentage
            gradient = abs(elev2 - elev1) / distance * 100
            max_found_gradient = max(max_found_gradient, gradient)

            if gradient > max_gradient:
                violations.append({
                    "segment_index": i,
                    "start": p1,
                    "end": p2,
                    "gradient": gradient,
                    "exceeds_by": gradient - max_gradient,
                })

        return {
            "is_valid": len(violations) == 0,
            "max_gradient_found": max_found_gradient,
            "violation_count": len(violations),
            "violations": violations,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gradient validation failed: {str(e)}")


@roads_router.get("/config/defaults")
async def get_road_config_defaults() -> dict:
    """
    Get default road configuration values.

    Returns recommended defaults for road network generation.
    """
    return {
        "road_width": {
            "default": 6.0,
            "min": 3.0,
            "max": 20.0,
            "unit": "meters",
            "description": "Width of access roads",
        },
        "max_gradient": {
            "default": 10.0,
            "min": 1.0,
            "max": 25.0,
            "unit": "percent",
            "description": "Maximum allowed road gradient",
        },
        "grid_resolution": {
            "default": 5.0,
            "min": 1.0,
            "max": 50.0,
            "unit": "meters",
            "description": "Resolution of pathfinding grid",
        },
        "smoothing_iterations": {
            "default": 3,
            "min": 0,
            "max": 10,
            "unit": "iterations",
            "description": "Number of path smoothing passes",
        },
        "terrain_weight": {
            "default": 1.0,
            "min": 0.0,
            "max": 5.0,
            "unit": "multiplier",
            "description": "Weight for terrain slope in cost calculation",
        },
        "distance_weight": {
            "default": 1.0,
            "min": 0.0,
            "max": 5.0,
            "unit": "multiplier",
            "description": "Weight for distance in cost calculation",
        },
    }


# ============================================================================
# Earthwork Volume Estimation Endpoints
# ============================================================================

from ..earthwork import (
    calculate_earthwork,
    PadDesign,
    RoadDesign,
    SoilProperties,
    CostFactors,
    SoilType,
    GradingMethod,
    DEFAULT_SOIL_PROPERTIES,
    DEFAULT_COST_FACTORS,
)


class PadDesignRequest(BaseModel):
    """Pad design for earthwork calculation."""
    asset_id: str = Field(description="Unique asset identifier")
    asset_type: str = Field(description="Type of asset (bess, substation, etc.)")
    position_x: float = Field(description="X coordinate of pad center")
    position_y: float = Field(description="Y coordinate of pad center")
    width: float = Field(description="Pad width in meters")
    length: float = Field(description="Pad length in meters")
    rotation: float = Field(default=0.0, description="Rotation in degrees")
    target_elevation: float | None = Field(default=None, description="Target elevation (auto if None)")
    grading_method: str = Field(default="level", description="Grading method: level, sloped, terraced")
    buffer_distance: float = Field(default=2.0, ge=0, description="Buffer around pad for grading")


class RoadDesignRequest(BaseModel):
    """Road segment design for earthwork calculation."""
    segment_id: str = Field(description="Unique segment identifier")
    start_x: float = Field(description="Start X coordinate")
    start_y: float = Field(description="Start Y coordinate")
    end_x: float = Field(description="End X coordinate")
    end_y: float = Field(description="End Y coordinate")
    width: float = Field(default=6.0, ge=3.0, description="Road width in meters")
    max_grade: float = Field(default=10.0, ge=1.0, le=25.0, description="Maximum grade %")
    shoulder_width: float = Field(default=1.0, ge=0, description="Shoulder width each side")


class SoilPropertiesRequest(BaseModel):
    """Soil properties for earthwork calculation."""
    soil_type: str = Field(default="mixed", description="Soil type: rock, gravel, sand, clay, topsoil, mixed")
    shrink_factor: float = Field(default=0.9, ge=0.5, le=1.0, description="Shrink factor for cut")
    swell_factor: float = Field(default=1.2, ge=1.0, le=2.0, description="Swell factor for fill")


class CostFactorsRequest(BaseModel):
    """Cost factors for earthwork estimation."""
    cut_cost_per_m3: float = Field(default=5.0, ge=0, description="Cost per m³ for excavation")
    fill_cost_per_m3: float = Field(default=8.0, ge=0, description="Cost per m³ for fill")
    haul_cost_per_m3_km: float = Field(default=2.0, ge=0, description="Cost per m³/km for hauling")
    import_cost_per_m3: float = Field(default=15.0, ge=0, description="Cost per m³ for importing")
    export_cost_per_m3: float = Field(default=10.0, ge=0, description="Cost per m³ for exporting")


class EarthworkRequest(BaseModel):
    """Request model for earthwork calculation."""
    project_id: str = Field(description="Project identifier")
    dem_id: str = Field(description="DEM ID for terrain data")
    pads: list[PadDesignRequest] = Field(default=[], description="List of pad designs")
    roads: list[RoadDesignRequest] = Field(default=[], description="List of road designs")
    soil_properties: SoilPropertiesRequest | None = Field(default=None, description="Soil properties")
    cost_factors: CostFactorsRequest | None = Field(default=None, description="Cost factors")


class VolumeResultResponse(BaseModel):
    """Volume result for a single element."""
    element_id: str
    element_type: str
    cut_volume_m3: float
    fill_volume_m3: float
    net_volume_m3: float
    adjusted_cut_m3: float
    adjusted_fill_m3: float
    area_m2: float
    average_cut_depth_m: float
    average_fill_depth_m: float
    max_cut_depth_m: float
    max_fill_depth_m: float
    design_elevation_m: float


class EarthworkSummaryResponse(BaseModel):
    """Response model for earthwork calculation."""
    project_id: str
    summary: dict
    pad_volumes: list[dict]
    road_volumes: list[dict]
    haul_routes: list[dict]
    cost_estimate: dict | None


# Earthwork router
earthwork_router = APIRouter()


@earthwork_router.post("/calculate", response_model=EarthworkSummaryResponse)
async def calculate_earthwork_volumes(request: EarthworkRequest) -> EarthworkSummaryResponse:
    """
    Calculate cut/fill volumes for asset pads and roads.

    Uses DEM data to calculate earthwork volumes, material balance,
    and cost estimates.
    """
    # Load DEM data
    dem_path = OUTPUT_DIR / f"{request.dem_id}_dem.tif"
    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        dem = load_dem_from_geotiff(dem_path)

        # Convert pad designs
        pads = [
            PadDesign(
                asset_id=p.asset_id,
                asset_type=p.asset_type,
                position=(p.position_x, p.position_y),
                dimensions=(p.width, p.length),
                rotation=p.rotation,
                target_elevation=p.target_elevation,
                grading_method=GradingMethod(p.grading_method) if p.grading_method else GradingMethod.LEVEL,
                buffer_distance=p.buffer_distance,
            )
            for p in request.pads
        ]

        # Convert road designs
        roads = [
            RoadDesign(
                segment_id=r.segment_id,
                start_point=(r.start_x, r.start_y),
                end_point=(r.end_x, r.end_y),
                width=r.width,
                max_grade=r.max_grade,
                shoulder_width=r.shoulder_width,
            )
            for r in request.roads
        ]

        # Build soil properties
        if request.soil_properties:
            sp = request.soil_properties
            soil_type = SoilType(sp.soil_type) if sp.soil_type else SoilType.MIXED
            soil_props = SoilProperties(
                soil_type=soil_type,
                shrink_factor=sp.shrink_factor,
                swell_factor=sp.swell_factor,
            )
        else:
            soil_props = DEFAULT_SOIL_PROPERTIES

        # Build cost factors
        if request.cost_factors:
            cf = request.cost_factors
            cost_factors = CostFactors(
                cut_cost_per_m3=cf.cut_cost_per_m3,
                fill_cost_per_m3=cf.fill_cost_per_m3,
                haul_cost_per_m3_km=cf.haul_cost_per_m3_km,
                import_cost_per_m3=cf.import_cost_per_m3,
                export_cost_per_m3=cf.export_cost_per_m3,
            )
        else:
            cost_factors = DEFAULT_COST_FACTORS

        # Calculate earthwork
        result = calculate_earthwork(
            project_id=request.project_id,
            dem_data=dem.data,
            dem_bounds=dem.bounds,
            dem_resolution=dem.resolution,
            pads=pads,
            roads=roads,
            soil_properties=soil_props,
            cost_factors=cost_factors,
            nodata_value=dem.nodata_value if dem.nodata_value else -9999.0,
        )

        return EarthworkSummaryResponse(**result.to_dict())

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Earthwork calculation failed: {str(e)}")


@earthwork_router.post("/calculate-single-pad")
async def calculate_single_pad_volume(
    dem_id: str,
    pad: PadDesignRequest,
    soil_properties: SoilPropertiesRequest | None = None,
) -> dict:
    """
    Calculate cut/fill volume for a single pad.

    Useful for quick estimates during interactive placement.
    """
    dem_path = OUTPUT_DIR / f"{dem_id}_dem.tif"
    if not dem_path.exists():
        raise HTTPException(status_code=404, detail="DEM not found")

    try:
        from ..earthwork import VolumeCalculator

        dem = load_dem_from_geotiff(dem_path)

        # Build soil properties
        if soil_properties:
            sp = soil_properties
            soil_type = SoilType(sp.soil_type) if sp.soil_type else SoilType.MIXED
            soil_props = SoilProperties(
                soil_type=soil_type,
                shrink_factor=sp.shrink_factor,
                swell_factor=sp.swell_factor,
            )
        else:
            soil_props = DEFAULT_SOIL_PROPERTIES

        calculator = VolumeCalculator(
            dem_data=dem.data,
            dem_bounds=dem.bounds,
            dem_resolution=dem.resolution,
            soil_properties=soil_props,
            nodata_value=dem.nodata_value if dem.nodata_value else -9999.0,
        )

        pad_design = PadDesign(
            asset_id=pad.asset_id,
            asset_type=pad.asset_type,
            position=(pad.position_x, pad.position_y),
            dimensions=(pad.width, pad.length),
            rotation=pad.rotation,
            target_elevation=pad.target_elevation,
            grading_method=GradingMethod(pad.grading_method) if pad.grading_method else GradingMethod.LEVEL,
            buffer_distance=pad.buffer_distance,
        )

        result = calculator.calculate_pad_volume(pad_design)
        return result.to_dict()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")


@earthwork_router.get("/soil-types")
async def get_soil_types() -> list[dict]:
    """Get available soil types with default properties."""
    return [
        {
            "value": st.value,
            "label": st.value.replace("_", " ").title(),
            "properties": {
                "shrink_factor": SoilProperties.get_default(st).shrink_factor,
                "swell_factor": SoilProperties.get_default(st).swell_factor,
                "max_slope_ratio": SoilProperties.get_default(st).max_slope_ratio,
                "unit_weight_kg_m3": SoilProperties.get_default(st).unit_weight,
            },
        }
        for st in SoilType
    ]


@earthwork_router.get("/cost-defaults")
async def get_cost_defaults() -> dict:
    """Get default cost factors."""
    return {
        "cut_cost_per_m3": {
            "default": DEFAULT_COST_FACTORS.cut_cost_per_m3,
            "unit": "$/m³",
            "description": "Excavation cost per cubic meter",
        },
        "fill_cost_per_m3": {
            "default": DEFAULT_COST_FACTORS.fill_cost_per_m3,
            "unit": "$/m³",
            "description": "Fill placement and compaction cost",
        },
        "haul_cost_per_m3_km": {
            "default": DEFAULT_COST_FACTORS.haul_cost_per_m3_km,
            "unit": "$/m³/km",
            "description": "Material hauling cost",
        },
        "import_cost_per_m3": {
            "default": DEFAULT_COST_FACTORS.import_cost_per_m3,
            "unit": "$/m³",
            "description": "Cost to import fill material",
        },
        "export_cost_per_m3": {
            "default": DEFAULT_COST_FACTORS.export_cost_per_m3,
            "unit": "$/m³",
            "description": "Cost to export excess material",
        },
        "rock_multiplier": {
            "default": DEFAULT_COST_FACTORS.rock_multiplier,
            "unit": "multiplier",
            "description": "Cost multiplier for rock excavation",
        },
    }


# ============================================================================
# PDF Report Generation Endpoints
# ============================================================================

from ..reports import (
    generate_report,
    ReportData,
    ReportConfig,
    ReportSection,
    ProjectInfo,
    TerrainSummary,
    AssetInfo,
    RoadInfo,
    EarthworkSummary as ReportEarthworkSummary,
    CostBreakdown,
)


class ProjectInfoRequest(BaseModel):
    """Project info for report."""
    project_id: str
    project_name: str
    client_name: str | None = None
    location: str | None = None
    total_area_m2: float = 0.0
    prepared_by: str | None = None
    revision: str = "1.0"


class TerrainSummaryRequest(BaseModel):
    """Terrain summary for report."""
    min_elevation: float
    max_elevation: float
    mean_elevation: float
    elevation_range: float
    min_slope: float
    max_slope: float
    mean_slope: float
    dominant_aspect: str
    buildable_area_percent: float
    slope_class_distribution: dict[str, float] = {}


class AssetInfoRequest(BaseModel):
    """Asset info for report."""
    asset_id: str
    asset_type: str
    name: str
    width: float
    length: float
    height: float
    area_m2: float
    position_x: float
    position_y: float
    rotation: float = 0.0
    cut_volume: float = 0.0
    fill_volume: float = 0.0
    net_earthwork: float = 0.0
    is_valid: bool = True


class RoadInfoRequest(BaseModel):
    """Road info for report."""
    segment_id: str
    length_m: float
    width_m: float = 6.0
    start_elevation: float = 0.0
    end_elevation: float = 0.0
    gradient_percent: float = 0.0
    cut_volume: float = 0.0
    fill_volume: float = 0.0


class EarthworkSummaryRequest(BaseModel):
    """Earthwork summary for report."""
    total_cut_volume: float
    total_fill_volume: float
    net_volume: float
    adjusted_cut: float
    adjusted_fill: float
    import_required: float
    export_required: float
    balance_on_site: float
    shrink_factor: float = 0.9
    swell_factor: float = 1.2


class CostBreakdownRequest(BaseModel):
    """Cost breakdown for report."""
    cut_cost: float
    fill_cost: float
    haul_cost: float
    import_cost: float
    export_cost: float
    total_earthwork_cost: float
    road_cost: float | None = None
    contingency_percent: float = 10.0


class ReportConfigRequest(BaseModel):
    """Report configuration."""
    sections: list[str] | None = None
    page_size: str = "letter"
    include_toc: bool = True
    company_name: str = "Site Layouts"


class ReportRequest(BaseModel):
    """Request model for report generation."""
    project: ProjectInfoRequest
    config: ReportConfigRequest | None = None
    terrain: TerrainSummaryRequest | None = None
    assets: list[AssetInfoRequest] = []
    roads: list[RoadInfoRequest] = []
    earthwork: EarthworkSummaryRequest | None = None
    costs: CostBreakdownRequest | None = None


class ReportResultResponse(BaseModel):
    """Response model for report generation."""
    success: bool
    filename: str
    file_size: int
    page_count: int
    generation_time_ms: float
    error: str | None = None


# Reports router
reports_router = APIRouter()


@reports_router.post("/generate", response_model=ReportResultResponse)
async def generate_pdf_report(request: ReportRequest) -> ReportResultResponse:
    """
    Generate a PDF report for the site layout.

    Returns report metadata. Use /download endpoint to get the PDF file.
    """
    from fastapi.responses import Response

    try:
        # Build report config
        config = ReportConfig(
            page_size=request.config.page_size if request.config else "letter",
            include_toc=request.config.include_toc if request.config else True,
            company_name=request.config.company_name if request.config else "Site Layouts",
        )

        if request.config and request.config.sections:
            config.sections = [ReportSection(s) for s in request.config.sections]

        # Build project info
        project = ProjectInfo(
            project_id=request.project.project_id,
            project_name=request.project.project_name,
            client_name=request.project.client_name,
            location=request.project.location,
            total_area_m2=request.project.total_area_m2,
            prepared_by=request.project.prepared_by,
            revision=request.project.revision,
        )

        # Build terrain summary
        terrain = None
        if request.terrain:
            terrain = TerrainSummary(
                min_elevation=request.terrain.min_elevation,
                max_elevation=request.terrain.max_elevation,
                mean_elevation=request.terrain.mean_elevation,
                elevation_range=request.terrain.elevation_range,
                min_slope=request.terrain.min_slope,
                max_slope=request.terrain.max_slope,
                mean_slope=request.terrain.mean_slope,
                dominant_aspect=request.terrain.dominant_aspect,
                buildable_area_percent=request.terrain.buildable_area_percent,
                slope_class_distribution=request.terrain.slope_class_distribution,
            )

        # Build assets list
        assets = [
            AssetInfo(
                asset_id=a.asset_id,
                asset_type=a.asset_type,
                name=a.name,
                dimensions=(a.width, a.length, a.height),
                area_m2=a.area_m2,
                position=(a.position_x, a.position_y),
                rotation=a.rotation,
                cut_volume=a.cut_volume,
                fill_volume=a.fill_volume,
                net_earthwork=a.net_earthwork,
                is_valid=a.is_valid,
            )
            for a in request.assets
        ]

        # Build roads list
        roads = [
            RoadInfo(
                segment_id=r.segment_id,
                length_m=r.length_m,
                width_m=r.width_m,
                start_elevation=r.start_elevation,
                end_elevation=r.end_elevation,
                gradient_percent=r.gradient_percent,
                cut_volume=r.cut_volume,
                fill_volume=r.fill_volume,
            )
            for r in request.roads
        ]

        # Build earthwork summary
        earthwork = None
        if request.earthwork:
            earthwork = ReportEarthworkSummary(
                total_cut_volume=request.earthwork.total_cut_volume,
                total_fill_volume=request.earthwork.total_fill_volume,
                net_volume=request.earthwork.net_volume,
                adjusted_cut=request.earthwork.adjusted_cut,
                adjusted_fill=request.earthwork.adjusted_fill,
                import_required=request.earthwork.import_required,
                export_required=request.earthwork.export_required,
                balance_on_site=request.earthwork.balance_on_site,
                shrink_factor=request.earthwork.shrink_factor,
                swell_factor=request.earthwork.swell_factor,
            )

        # Build cost breakdown
        costs = None
        if request.costs:
            costs = CostBreakdown(
                cut_cost=request.costs.cut_cost,
                fill_cost=request.costs.fill_cost,
                haul_cost=request.costs.haul_cost,
                import_cost=request.costs.import_cost,
                export_cost=request.costs.export_cost,
                total_earthwork_cost=request.costs.total_earthwork_cost,
                road_cost=request.costs.road_cost,
                contingency_percent=request.costs.contingency_percent,
            )
            costs.calculate_totals()

        # Create report data
        report_data = ReportData(
            project=project,
            config=config,
            terrain=terrain,
            assets=assets,
            roads=roads,
            earthwork=earthwork,
            costs=costs,
        )

        # Generate report
        result = generate_report(report_data)

        # Store PDF temporarily for download
        if result.success and result.pdf_data:
            # Save to output directory
            output_path = OUTPUT_DIR / result.filename
            output_path.write_bytes(result.pdf_data)

        return ReportResultResponse(
            success=result.success,
            filename=result.filename,
            file_size=result.file_size,
            page_count=result.page_count,
            generation_time_ms=result.generation_time_ms,
            error=result.error,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@reports_router.get("/download/{filename}")
async def download_report(filename: str):
    """Download a generated PDF report."""
    from fastapi.responses import FileResponse

    file_path = OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
    )


@reports_router.get("/sections")
async def get_available_sections() -> list[dict]:
    """Get available report sections."""
    return [
        {"value": "cover", "label": "Cover Page", "default": True},
        {"value": "executive_summary", "label": "Executive Summary", "default": True},
        {"value": "site_overview", "label": "Site Overview", "default": True},
        {"value": "terrain_analysis", "label": "Terrain Analysis", "default": True},
        {"value": "layout_plan", "label": "Layout Plan", "default": True},
        {"value": "asset_schedule", "label": "Asset Schedule", "default": True},
        {"value": "earthwork_summary", "label": "Earthwork Summary", "default": True},
        {"value": "cost_estimate", "label": "Cost Estimate", "default": True},
        {"value": "road_network", "label": "Road Network", "default": False},
        {"value": "appendix", "label": "Appendix", "default": False},
    ]


# ============================================================================
# Carbon Calculator / ESG Endpoints
# ============================================================================

from ..carbon import (
    CarbonCalculator,
    calculate_project_carbon,
    EquipmentType,
    FuelType,
    EnergySource,
    EPAEmissionFactors,
    HaulingParameters,
    EarthworkCarbonInput,
    RoadConstructionInput,
    ProjectEnergyProfile,
)


class EquipmentOperationRequest(BaseModel):
    """Equipment operation for carbon calculation."""
    equipment_type: str = Field(description="Equipment type: excavator, bulldozer, loader, grader, compactor, dump_truck, scraper")
    operating_days: int = Field(ge=1, description="Number of operating days")


class HaulingParametersRequest(BaseModel):
    """Hauling parameters for carbon calculation."""
    haul_distance_km: float = Field(ge=0, description="One-way haul distance in km")
    truck_capacity_m3: float = Field(default=15.0, ge=5.0, description="Truck capacity in m³")


class RoadConstructionRequest(BaseModel):
    """Road construction for carbon calculation."""
    total_length_m: float = Field(ge=0, description="Total road length in meters")
    width_m: float = Field(default=6.0, ge=3.0, description="Road width in meters")
    pavement_depth_m: float = Field(default=0.15, ge=0.05, description="Pavement depth")
    material_type: str = Field(default="asphalt", description="Material: asphalt or concrete")


class EnergyProfileRequest(BaseModel):
    """Energy generation profile for carbon offset calculation."""
    capacity_mw: float = Field(ge=0, description="Project capacity in MW")
    capacity_factor: float = Field(default=0.25, ge=0.1, le=0.5, description="Capacity factor")
    energy_source: str = Field(default="solar", description="Energy source: solar, wind")
    project_lifetime_years: int = Field(default=25, ge=10, le=40, description="Project lifetime")


class CarbonCalculationRequest(BaseModel):
    """Request model for carbon calculation."""
    project_id: str = Field(description="Project identifier")
    cut_volume_m3: float = Field(default=0.0, ge=0, description="Cut volume in m³")
    fill_volume_m3: float = Field(default=0.0, ge=0, description="Fill volume in m³")
    import_volume_m3: float = Field(default=0.0, ge=0, description="Import volume in m³")
    export_volume_m3: float = Field(default=0.0, ge=0, description="Export volume in m³")
    equipment: list[EquipmentOperationRequest] = Field(default=[], description="Equipment operations")
    hauling: HaulingParametersRequest | None = Field(default=None, description="Hauling parameters")
    road_construction: RoadConstructionRequest | None = Field(default=None, description="Road construction")
    energy_profile: EnergyProfileRequest | None = Field(default=None, description="Energy generation profile")
    grid_baseline: str = Field(default="us_average_grid", description="Grid baseline for offset comparison")


class CarbonResultResponse(BaseModel):
    """Response model for carbon calculation."""
    project_id: str
    construction: dict
    offset: dict | None = None
    lifetime: dict | None = None
    total_construction_metric_tons: float
    total_offset_metric_tons: float = 0.0
    net_lifetime_metric_tons: float = 0.0
    carbon_payback_years: float | None = None
    equivalents: dict


# Carbon router
carbon_router = APIRouter()


@carbon_router.post("/calculate", response_model=CarbonResultResponse)
async def calculate_carbon_footprint(request: CarbonCalculationRequest) -> CarbonResultResponse:
    """
    Calculate carbon footprint for a construction project.

    Calculates emissions from:
    - Construction equipment operation
    - Material hauling
    - Road construction materials

    And optionally calculates:
    - Carbon offset from clean energy generation
    - Net lifetime impact
    - Carbon payback period
    """
    try:
        calculator = CarbonCalculator()

        # Convert equipment to dict
        equipment_days = {}
        for eq in request.equipment:
            try:
                eq_type = EquipmentType(eq.equipment_type)
                equipment_days[eq_type] = eq.operating_days
            except ValueError:
                pass  # Skip invalid equipment types

        # Build hauling parameters
        hauling = None
        if request.hauling and request.hauling.haul_distance_km > 0:
            hauling = HaulingParameters(
                haul_distance_km=request.hauling.haul_distance_km,
                truck_capacity_m3=request.hauling.truck_capacity_m3,
            )

        # Build earthwork input
        earthwork = EarthworkCarbonInput(
            cut_volume_m3=request.cut_volume_m3,
            fill_volume_m3=request.fill_volume_m3,
            import_volume_m3=request.import_volume_m3,
            export_volume_m3=request.export_volume_m3,
            hauling=hauling,
            equipment_days=equipment_days,
        )

        # Build road construction input
        road_input = None
        if request.road_construction and request.road_construction.total_length_m > 0:
            road_input = RoadConstructionInput(
                total_length_m=request.road_construction.total_length_m,
                width_m=request.road_construction.width_m,
                pavement_depth_m=request.road_construction.pavement_depth_m,
                material_type=request.road_construction.material_type,
            )

        # Build energy profile
        energy_profile = None
        if request.energy_profile and request.energy_profile.capacity_mw > 0:
            energy_source = EnergySource.SOLAR
            try:
                energy_source = EnergySource(request.energy_profile.energy_source)
            except ValueError:
                pass

            energy_profile = ProjectEnergyProfile(
                capacity_mw=request.energy_profile.capacity_mw,
                capacity_factor=request.energy_profile.capacity_factor,
                energy_source=energy_source,
                project_lifetime_years=request.energy_profile.project_lifetime_years,
            )

        # Get grid baseline
        grid_baseline = EnergySource.US_AVERAGE_GRID
        try:
            grid_baseline = EnergySource(request.grid_baseline)
        except ValueError:
            pass

        # Calculate
        result = calculator.calculate_full_analysis(
            project_id=request.project_id,
            earthwork=earthwork,
            road_input=road_input,
            energy_profile=energy_profile,
            grid_baseline=grid_baseline,
        )

        return CarbonResultResponse(**result.to_dict())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Carbon calculation failed: {str(e)}")


@carbon_router.post("/quick-estimate")
async def quick_carbon_estimate(
    project_id: str,
    cut_volume_m3: float = 0.0,
    fill_volume_m3: float = 0.0,
    haul_distance_km: float = 10.0,
    road_length_m: float = 0.0,
    capacity_mw: float = 0.0,
) -> dict:
    """
    Quick carbon estimate with minimal inputs.

    Provides a rough estimate based on earthwork volumes and
    optional energy generation capacity.
    """
    try:
        result = calculate_project_carbon(
            project_id=project_id,
            cut_volume_m3=cut_volume_m3,
            fill_volume_m3=fill_volume_m3,
            haul_distance_km=haul_distance_km,
            road_length_m=road_length_m,
            capacity_mw=capacity_mw,
        )
        return result.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")


@carbon_router.get("/emission-factors")
async def get_emission_factors() -> dict:
    """
    Get EPA emission factors used in calculations.

    Returns emission factors for fuels, materials, and electricity.
    """
    factors = EPAEmissionFactors()
    return {
        "fuels": {
            "diesel": {
                "value": factors.diesel_kg_per_gallon,
                "unit": "kg CO2/gallon",
                "source": "EPA GHG Emission Factors Hub 2023",
            },
            "gasoline": {
                "value": factors.gasoline_kg_per_gallon,
                "unit": "kg CO2/gallon",
                "source": "EPA GHG Emission Factors Hub 2023",
            },
            "biodiesel_b20": {
                "value": factors.biodiesel_b20_kg_per_gallon,
                "unit": "kg CO2/gallon",
                "source": "EPA GHG Emission Factors Hub 2023",
            },
            "natural_gas": {
                "value": factors.natural_gas_kg_per_therm,
                "unit": "kg CO2/therm",
                "source": "EPA GHG Emission Factors Hub 2023",
            },
        },
        "electricity": {
            "us_average": {
                "value": factors.electricity_us_avg_kg_per_kwh,
                "unit": "kg CO2/kWh",
                "source": "EPA eGRID 2023",
            },
            "clean": {
                "value": factors.electricity_clean_kg_per_kwh,
                "unit": "kg CO2/kWh",
                "description": "Solar/Wind generation",
            },
        },
        "materials": {
            "concrete": {
                "value": factors.concrete_kg_per_ton,
                "unit": "kg CO2/metric ton",
                "source": "EPA AP-42",
            },
            "steel": {
                "value": factors.steel_kg_per_ton,
                "unit": "kg CO2/metric ton",
                "source": "EPA AP-42",
            },
            "asphalt": {
                "value": factors.asphalt_kg_per_ton,
                "unit": "kg CO2/metric ton",
                "source": "EPA AP-42",
            },
            "gravel": {
                "value": factors.gravel_kg_per_ton,
                "unit": "kg CO2/metric ton",
                "source": "EPA AP-42",
            },
        },
    }


@carbon_router.get("/equipment-profiles")
async def get_equipment_profiles() -> list[dict]:
    """
    Get default equipment emission profiles.

    Returns fuel consumption rates and emission profiles for
    standard construction equipment.
    """
    from ..carbon import DEFAULT_EQUIPMENT_PROFILES

    profiles = []
    for eq_type, profile in DEFAULT_EQUIPMENT_PROFILES.items():
        profiles.append({
            "equipment_type": eq_type.value,
            "name": eq_type.value.replace("_", " ").title(),
            "fuel_type": profile.fuel_type.value,
            "fuel_consumption_per_hour": profile.fuel_consumption_per_hour,
            "operating_hours_per_day": profile.operating_hours_per_day,
            "utilization_factor": profile.utilization_factor,
            "daily_fuel_gallons": profile.daily_fuel_consumption(),
        })
    return profiles


@carbon_router.get("/grid-factors")
async def get_grid_emission_factors() -> list[dict]:
    """
    Get grid emission factors for different energy sources.

    Returns kg CO2 per MWh for various energy sources,
    used for calculating carbon offset from clean energy.
    """
    from ..carbon import GridEmissionFactors

    factors = GridEmissionFactors()
    return [
        {
            "source": source.value,
            "name": source.value.replace("_", " ").title(),
            "kg_co2_per_mwh": factor,
            "description": _get_source_description(source),
        }
        for source, factor in factors.source_factors.items()
    ]


def _get_source_description(source: EnergySource) -> str:
    """Get description for energy source."""
    descriptions = {
        EnergySource.SOLAR: "Photovoltaic solar generation",
        EnergySource.WIND: "Wind turbine generation",
        EnergySource.NATURAL_GAS_GRID: "Natural gas combined cycle",
        EnergySource.COAL: "Coal-fired power plant",
        EnergySource.NUCLEAR: "Nuclear power plant",
        EnergySource.HYDRO: "Hydroelectric generation",
        EnergySource.US_AVERAGE_GRID: "US average grid mix (2023)",
    }
    return descriptions.get(source, "")


# ============================================================================
# Habitat / Environmental Overlay Endpoints
# ============================================================================

from ..habitat import (
    analyze_habitat,
    HabitatImpactCalculator,
    SpeciesStatus,
    WetlandType,
    HabitatSensitivity,
    PermitType,
    BUFFER_DISTANCES,
    PERMIT_TIMELINES,
)


class HabitatAnalysisRequest(BaseModel):
    """Request model for habitat analysis."""
    site_id: str = Field(description="Site identifier")
    boundary: dict = Field(description="GeoJSON polygon of site boundary")
    latitude: float = Field(description="Site centroid latitude")
    longitude: float = Field(description="Site centroid longitude")


class HabitatAnalysisResponse(BaseModel):
    """Response model for habitat analysis."""
    site_id: str
    analysis_date: str
    species: dict
    critical_habitats: dict
    wetlands: dict
    buffer_zones: dict
    impact_score: dict | None
    data_quality: dict


# Habitat router
habitat_router = APIRouter()


@habitat_router.post("/analyze", response_model=HabitatAnalysisResponse)
async def analyze_site_habitat(request: HabitatAnalysisRequest) -> HabitatAnalysisResponse:
    """
    Analyze habitat for endangered species and wetlands.

    Integrates data from:
    - USFWS Endangered Species database
    - National Wetlands Inventory (NWI)
    - Critical Habitat designations

    Returns species present, wetland areas, buffer zones,
    and an overall habitat impact score.
    """
    try:
        result = await analyze_habitat(
            site_id=request.site_id,
            boundary_geojson=request.boundary,
            latitude=request.latitude,
            longitude=request.longitude,
        )

        result_dict = result.to_dict()
        return HabitatAnalysisResponse(**result_dict)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Habitat analysis failed: {str(e)}")


@habitat_router.get("/species-status")
async def get_species_status_types() -> list[dict]:
    """Get available species status types."""
    return [
        {"value": "endangered", "label": "Endangered", "description": "In danger of extinction throughout all or a significant portion of its range"},
        {"value": "threatened", "label": "Threatened", "description": "Likely to become endangered within the foreseeable future"},
        {"value": "candidate", "label": "Candidate", "description": "Under review for listing"},
        {"value": "proposed_endangered", "label": "Proposed Endangered", "description": "Proposed for endangered listing"},
        {"value": "proposed_threatened", "label": "Proposed Threatened", "description": "Proposed for threatened listing"},
    ]


@habitat_router.get("/wetland-types")
async def get_wetland_types() -> list[dict]:
    """Get wetland classification types (Cowardin system)."""
    return [
        {"code": "PEM", "label": "Freshwater Emergent Wetland", "description": "Herbaceous marsh vegetation"},
        {"code": "PFO", "label": "Freshwater Forested Wetland", "description": "Forested swamp or bottomland"},
        {"code": "PSS", "label": "Freshwater Shrub Wetland", "description": "Shrub-dominated wetland"},
        {"code": "PUB", "label": "Freshwater Pond", "description": "Open water with unconsolidated bottom"},
        {"code": "L", "label": "Lake", "description": "Lacustrine system"},
        {"code": "R", "label": "River/Stream", "description": "Riverine system"},
        {"code": "E", "label": "Estuarine", "description": "Tidal saltwater/brackish wetland"},
        {"code": "M", "label": "Marine", "description": "Ocean and nearshore areas"},
    ]


@habitat_router.get("/permits")
async def get_permit_types() -> list[dict]:
    """Get environmental permit types and typical timelines."""
    return [
        {
            "type": "section_7",
            "name": "ESA Section 7 Consultation",
            "description": "Federal consultation for endangered species",
            "typical_months": PERMIT_TIMELINES.get(PermitType.SECTION_7_CONSULTATION, 0),
            "triggers": ["Listed species in project area", "Federal funding or permit"],
        },
        {
            "type": "section_10",
            "name": "ESA Section 10 Permit",
            "description": "Incidental take permit for non-federal actions",
            "typical_months": PERMIT_TIMELINES.get(PermitType.SECTION_10_PERMIT, 0),
            "triggers": ["Listed species present", "No federal nexus"],
        },
        {
            "type": "section_404",
            "name": "Clean Water Act Section 404",
            "description": "Wetland fill permit",
            "typical_months": PERMIT_TIMELINES.get(PermitType.SECTION_404_PERMIT, 0),
            "triggers": ["Wetland disturbance", "Stream crossing"],
        },
        {
            "type": "nepa_ea",
            "name": "NEPA Environmental Assessment",
            "description": "Environmental review for federal actions",
            "typical_months": PERMIT_TIMELINES.get(PermitType.NEPA_EA, 0),
            "triggers": ["Federal land", "Federal funding", "Major wetland impacts"],
        },
        {
            "type": "nepa_eis",
            "name": "NEPA Environmental Impact Statement",
            "description": "Full environmental review",
            "typical_months": PERMIT_TIMELINES.get(PermitType.NEPA_EIS, 0),
            "triggers": ["Significant environmental impact", "Large wetland fill"],
        },
        {
            "type": "migratory_bird",
            "name": "Migratory Bird Treaty Act",
            "description": "Protection for migratory birds",
            "typical_months": PERMIT_TIMELINES.get(PermitType.MIGRATORY_BIRD, 0),
            "triggers": ["Bird nesting habitat", "Construction timing"],
        },
    ]


@habitat_router.get("/buffer-standards")
async def get_buffer_standards() -> dict:
    """Get standard buffer distances for sensitive habitats."""
    return {
        "buffers": {
            "critical_habitat": {
                "distance_m": BUFFER_DISTANCES["critical_habitat"],
                "description": "Designated critical habitat for listed species",
            },
            "wetland_large": {
                "distance_m": BUFFER_DISTANCES["wetland_large"],
                "description": "Wetlands > 0.5 hectares",
            },
            "wetland_small": {
                "distance_m": BUFFER_DISTANCES["wetland_small"],
                "description": "Wetlands < 0.5 hectares",
            },
            "stream_perennial": {
                "distance_m": BUFFER_DISTANCES["stream_perennial"],
                "description": "Year-round flowing streams",
            },
            "stream_intermittent": {
                "distance_m": BUFFER_DISTANCES["stream_intermittent"],
                "description": "Seasonal streams",
            },
            "eagle_nest": {
                "distance_m": BUFFER_DISTANCES["eagle_nest"],
                "description": "Bald and golden eagle nests",
            },
            "colonial_bird_rookery": {
                "distance_m": BUFFER_DISTANCES["colonial_bird_rookery"],
                "description": "Colonial nesting bird sites",
            },
        },
        "sensitivity_levels": [
            {"level": "critical", "description": "No development allowed"},
            {"level": "high", "description": "Significant restrictions apply"},
            {"level": "moderate", "description": "Permits and mitigation required"},
            {"level": "low", "description": "Minor considerations"},
            {"level": "none", "description": "No significant habitat concerns"},
        ],
    }


@habitat_router.get("/sensitivity-scores")
async def get_sensitivity_score_interpretation() -> dict:
    """Get interpretation guide for habitat impact scores."""
    return {
        "score_ranges": [
            {
                "range": "90-100",
                "sensitivity": "None",
                "description": "No significant habitat constraints",
                "typical_permits": [],
                "estimated_delay_months": 0,
            },
            {
                "range": "70-89",
                "sensitivity": "Low",
                "description": "Minor habitat considerations, standard permits",
                "typical_permits": ["migratory_bird"],
                "estimated_delay_months": 3,
            },
            {
                "range": "50-69",
                "sensitivity": "Moderate",
                "description": "Wetlands or threatened species present",
                "typical_permits": ["section_404", "section_7"],
                "estimated_delay_months": 8,
            },
            {
                "range": "30-49",
                "sensitivity": "High",
                "description": "Significant habitat constraints",
                "typical_permits": ["section_404", "section_7", "nepa_ea"],
                "estimated_delay_months": 12,
            },
            {
                "range": "0-29",
                "sensitivity": "Critical",
                "description": "Critical habitat or endangered species",
                "typical_permits": ["section_7", "section_10", "nepa_eis"],
                "estimated_delay_months": 18,
            },
        ],
        "component_weights": {
            "species_impact": 0.35,
            "critical_habitat_impact": 0.25,
            "wetland_impact": 0.25,
            "buffer_zone_impact": 0.15,
        },
    }
