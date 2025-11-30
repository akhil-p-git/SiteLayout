"""
Terrain Analysis Module

Provides DEM generation, slope/aspect calculation, and buildability scoring.
"""

from .analysis import (
    DEFAULT_SLOPE_CLASSES,
    AspectResult,
    ClassifiedSlopeResult,
    SlopeClassBreakpoint,
    SlopeResult,
    SlopeUnit,
    TerrainMetrics,
    calculate_aspect,
    calculate_slope,
    calculate_terrain_metrics,
    classify_slope,
    generate_aspect_visualization,
    generate_slope_visualization,
    identify_steep_areas,
    save_aspect_as_geotiff,
    save_slope_as_geotiff,
)
from .dem_generator import (
    DEMConfig,
    DEMResult,
    generate_dem_from_contours,
    generate_dem_from_points,
    load_dem_from_geotiff,
    resample_dem,
    save_dem_as_geotiff,
)

__all__ = [
    # DEM Generator
    "DEMConfig",
    "DEMResult",
    "generate_dem_from_contours",
    "generate_dem_from_points",
    "save_dem_as_geotiff",
    "load_dem_from_geotiff",
    "resample_dem",
    # Terrain Analysis
    "SlopeUnit",
    "SlopeClassBreakpoint",
    "DEFAULT_SLOPE_CLASSES",
    "TerrainMetrics",
    "SlopeResult",
    "AspectResult",
    "ClassifiedSlopeResult",
    "calculate_slope",
    "calculate_aspect",
    "classify_slope",
    "calculate_terrain_metrics",
    "generate_slope_visualization",
    "generate_aspect_visualization",
    "identify_steep_areas",
    "save_slope_as_geotiff",
    "save_aspect_as_geotiff",
]
