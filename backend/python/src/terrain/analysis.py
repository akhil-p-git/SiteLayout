"""
Terrain Analysis Module

Calculates slope, aspect, elevation metrics, and buildability scores from DEM data.
"""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Sequence

import numpy as np
from numpy.typing import NDArray
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

from .dem_generator import DEMResult, save_dem_as_geotiff


class SlopeUnit(str, Enum):
    """Units for slope measurement."""
    DEGREES = "degrees"
    PERCENT = "percent"
    RATIO = "ratio"


@dataclass
class SlopeClassBreakpoint:
    """Defines a slope classification breakpoint."""
    max_slope: float  # Maximum slope for this class (in degrees)
    label: str
    color: tuple[int, int, int]  # RGB color for visualization
    buildable: bool = True


# Default slope classification for solar sites
DEFAULT_SLOPE_CLASSES: list[SlopeClassBreakpoint] = [
    SlopeClassBreakpoint(max_slope=3.0, label="Flat (0-3%)", color=(0, 128, 0), buildable=True),
    SlopeClassBreakpoint(max_slope=5.0, label="Gentle (3-5%)", color=(144, 238, 144), buildable=True),
    SlopeClassBreakpoint(max_slope=10.0, label="Moderate (5-10%)", color=(255, 255, 0), buildable=True),
    SlopeClassBreakpoint(max_slope=15.0, label="Steep (10-15%)", color=(255, 165, 0), buildable=False),
    SlopeClassBreakpoint(max_slope=float('inf'), label="Very Steep (>15%)", color=(255, 0, 0), buildable=False),
]


@dataclass
class TerrainMetrics:
    """Elevation and terrain metrics for an area."""
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
    aspect_distribution: dict[str, float]  # Percentage in each direction

    buildable_area_percent: float
    slope_class_distribution: dict[str, float]


@dataclass
class SlopeResult:
    """Result of slope calculation."""
    data: NDArray[np.float64]
    unit: SlopeUnit
    transform: Affine
    crs: CRS
    nodata_value: float
    min_slope: float
    max_slope: float
    mean_slope: float

    def to_dem_result(self) -> DEMResult:
        """Convert to DEMResult for saving."""
        return DEMResult(
            data=self.data,
            transform=self.transform,
            crs=self.crs,
            bounds=(0, 0, 0, 0),  # Will be calculated
            resolution=abs(self.transform.a),
            nodata_value=self.nodata_value,
            min_elevation=self.min_slope,
            max_elevation=self.max_slope,
            width=self.data.shape[1],
            height=self.data.shape[0],
        )


@dataclass
class AspectResult:
    """Result of aspect calculation."""
    data: NDArray[np.float64]  # 0-360 degrees, -1 for flat
    transform: Affine
    crs: CRS
    nodata_value: float
    distribution: dict[str, float]  # Percentage in each cardinal direction

    def to_dem_result(self) -> DEMResult:
        """Convert to DEMResult for saving."""
        return DEMResult(
            data=self.data,
            transform=self.transform,
            crs=self.crs,
            bounds=(0, 0, 0, 0),
            resolution=abs(self.transform.a),
            nodata_value=self.nodata_value,
            min_elevation=0,
            max_elevation=360,
            width=self.data.shape[1],
            height=self.data.shape[0],
        )


@dataclass
class ClassifiedSlopeResult:
    """Result of slope classification."""
    data: NDArray[np.int32]  # Class indices
    classes: list[SlopeClassBreakpoint]
    transform: Affine
    crs: CRS
    nodata_value: int
    class_distribution: dict[str, float]  # Percentage in each class
    buildable_percent: float


def calculate_slope(
    dem: DEMResult,
    unit: SlopeUnit = SlopeUnit.DEGREES,
) -> SlopeResult:
    """
    Calculate slope from a DEM.

    Uses the Horn algorithm (3x3 neighborhood) for slope calculation.

    Args:
        dem: Input DEM
        unit: Output unit (degrees, percent, or ratio)

    Returns:
        SlopeResult containing the slope raster
    """
    data = dem.data.copy()
    nodata = dem.nodata_value

    # Get cell size
    cell_size_x = abs(dem.transform.a)
    cell_size_y = abs(dem.transform.e)

    # Replace nodata with NaN for calculations
    data = np.where(data == nodata, np.nan, data)

    # Pad array to handle edges
    padded = np.pad(data, 1, mode='edge')

    # Extract 3x3 neighborhood values using Horn's method
    # z1 z2 z3
    # z4 z5 z6
    # z7 z8 z9
    z1 = padded[:-2, :-2]
    z2 = padded[:-2, 1:-1]
    z3 = padded[:-2, 2:]
    z4 = padded[1:-1, :-2]
    z6 = padded[1:-1, 2:]
    z7 = padded[2:, :-2]
    z8 = padded[2:, 1:-1]
    z9 = padded[2:, 2:]

    # Calculate dz/dx and dz/dy using Horn's method
    dz_dx = ((z3 + 2*z6 + z9) - (z1 + 2*z4 + z7)) / (8 * cell_size_x)
    dz_dy = ((z7 + 2*z8 + z9) - (z1 + 2*z2 + z3)) / (8 * cell_size_y)

    # Calculate slope
    slope_radians = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))

    # Convert to requested unit
    if unit == SlopeUnit.DEGREES:
        slope = np.degrees(slope_radians)
    elif unit == SlopeUnit.PERCENT:
        slope = np.tan(slope_radians) * 100
    else:  # RATIO
        slope = np.tan(slope_radians)

    # Replace NaN with nodata
    slope = np.where(np.isnan(slope), nodata, slope)

    # Calculate statistics
    valid_slope = slope[slope != nodata]

    return SlopeResult(
        data=slope.astype(np.float64),
        unit=unit,
        transform=dem.transform,
        crs=dem.crs,
        nodata_value=nodata,
        min_slope=float(np.nanmin(valid_slope)) if len(valid_slope) > 0 else 0,
        max_slope=float(np.nanmax(valid_slope)) if len(valid_slope) > 0 else 0,
        mean_slope=float(np.nanmean(valid_slope)) if len(valid_slope) > 0 else 0,
    )


def calculate_aspect(dem: DEMResult) -> AspectResult:
    """
    Calculate aspect (slope direction) from a DEM.

    Returns values from 0-360 degrees (clockwise from north).
    Flat areas (no slope) return -1.

    Args:
        dem: Input DEM

    Returns:
        AspectResult containing the aspect raster
    """
    data = dem.data.copy()
    nodata = dem.nodata_value

    # Get cell size
    cell_size_x = abs(dem.transform.a)
    cell_size_y = abs(dem.transform.e)

    # Replace nodata with NaN
    data = np.where(data == nodata, np.nan, data)

    # Pad array
    padded = np.pad(data, 1, mode='edge')

    # Extract neighborhood
    z1 = padded[:-2, :-2]
    z2 = padded[:-2, 1:-1]
    z3 = padded[:-2, 2:]
    z4 = padded[1:-1, :-2]
    z6 = padded[1:-1, 2:]
    z7 = padded[2:, :-2]
    z8 = padded[2:, 1:-1]
    z9 = padded[2:, 2:]

    # Calculate gradients
    dz_dx = ((z3 + 2*z6 + z9) - (z1 + 2*z4 + z7)) / (8 * cell_size_x)
    dz_dy = ((z7 + 2*z8 + z9) - (z1 + 2*z2 + z3)) / (8 * cell_size_y)

    # Calculate aspect (in radians, then convert to degrees)
    # atan2 returns -pi to pi, we need 0 to 360
    aspect_rad = np.arctan2(dz_dy, -dz_dx)
    aspect_deg = np.degrees(aspect_rad)

    # Convert to 0-360 (clockwise from north)
    aspect_deg = 90.0 - aspect_deg
    aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360, aspect_deg)
    aspect_deg = np.where(aspect_deg >= 360, aspect_deg - 360, aspect_deg)

    # Mark flat areas (where slope is essentially 0)
    slope_magnitude = np.sqrt(dz_dx**2 + dz_dy**2)
    aspect_deg = np.where(slope_magnitude < 0.0001, -1, aspect_deg)

    # Replace NaN with nodata
    aspect_deg = np.where(np.isnan(aspect_deg), nodata, aspect_deg)

    # Calculate distribution
    valid_aspect = aspect_deg[(aspect_deg != nodata) & (aspect_deg >= 0)]
    distribution = _calculate_aspect_distribution(valid_aspect)

    return AspectResult(
        data=aspect_deg.astype(np.float64),
        transform=dem.transform,
        crs=dem.crs,
        nodata_value=nodata,
        distribution=distribution,
    )


def _calculate_aspect_distribution(aspect_data: NDArray[np.float64]) -> dict[str, float]:
    """Calculate percentage of area facing each cardinal direction."""
    if len(aspect_data) == 0:
        return {d: 0.0 for d in ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "Flat"]}

    total = len(aspect_data)

    # Define direction ranges (clockwise from north)
    directions = {
        "N": (337.5, 22.5),
        "NE": (22.5, 67.5),
        "E": (67.5, 112.5),
        "SE": (112.5, 157.5),
        "S": (157.5, 202.5),
        "SW": (202.5, 247.5),
        "W": (247.5, 292.5),
        "NW": (292.5, 337.5),
    }

    distribution: dict[str, float] = {}

    for direction, (start, end) in directions.items():
        if direction == "N":
            # North wraps around 0/360
            count = np.sum((aspect_data >= start) | (aspect_data < end))
        else:
            count = np.sum((aspect_data >= start) & (aspect_data < end))
        distribution[direction] = float(count / total * 100)

    # Count flat areas
    flat_count = np.sum(aspect_data < 0)
    distribution["Flat"] = float(flat_count / total * 100) if total > 0 else 0.0

    return distribution


def classify_slope(
    slope: SlopeResult,
    classes: Sequence[SlopeClassBreakpoint] | None = None,
) -> ClassifiedSlopeResult:
    """
    Classify slope into discrete categories.

    Args:
        slope: Slope raster (should be in degrees)
        classes: Classification breakpoints (uses defaults if None)

    Returns:
        ClassifiedSlopeResult with class indices
    """
    if classes is None:
        classes = DEFAULT_SLOPE_CLASSES

    classes = list(classes)
    data = slope.data.copy()
    nodata = slope.nodata_value

    # Initialize with nodata
    classified = np.full(data.shape, -1, dtype=np.int32)

    # Classify each pixel
    prev_max = 0.0
    for i, cls in enumerate(classes):
        mask = (data >= prev_max) & (data < cls.max_slope) & (data != nodata)
        classified[mask] = i
        prev_max = cls.max_slope

    # Calculate distribution
    valid_data = classified[classified >= 0]
    total = len(valid_data)

    distribution: dict[str, float] = {}
    buildable_count = 0

    for i, cls in enumerate(classes):
        count = np.sum(valid_data == i)
        pct = float(count / total * 100) if total > 0 else 0.0
        distribution[cls.label] = pct
        if cls.buildable:
            buildable_count += count

    buildable_percent = float(buildable_count / total * 100) if total > 0 else 0.0

    return ClassifiedSlopeResult(
        data=classified,
        classes=classes,
        transform=slope.transform,
        crs=slope.crs,
        nodata_value=-1,
        class_distribution=distribution,
        buildable_percent=buildable_percent,
    )


def calculate_terrain_metrics(
    dem: DEMResult,
    slope_classes: Sequence[SlopeClassBreakpoint] | None = None,
) -> TerrainMetrics:
    """
    Calculate comprehensive terrain metrics for an area.

    Args:
        dem: Input DEM
        slope_classes: Optional custom slope classification

    Returns:
        TerrainMetrics with all calculated values
    """
    # Calculate slope and aspect
    slope = calculate_slope(dem, SlopeUnit.DEGREES)
    aspect = calculate_aspect(dem)
    classified = classify_slope(slope, slope_classes)

    # Get valid elevation data
    valid_elev = dem.data[dem.data != dem.nodata_value]

    # Determine dominant aspect
    aspect_dist = aspect.distribution
    dominant = max(
        [(k, v) for k, v in aspect_dist.items() if k != "Flat"],
        key=lambda x: x[1],
        default=("N", 0)
    )

    return TerrainMetrics(
        min_elevation=float(np.min(valid_elev)) if len(valid_elev) > 0 else 0,
        max_elevation=float(np.max(valid_elev)) if len(valid_elev) > 0 else 0,
        mean_elevation=float(np.mean(valid_elev)) if len(valid_elev) > 0 else 0,
        elevation_range=float(np.ptp(valid_elev)) if len(valid_elev) > 0 else 0,
        std_elevation=float(np.std(valid_elev)) if len(valid_elev) > 0 else 0,
        min_slope=slope.min_slope,
        max_slope=slope.max_slope,
        mean_slope=slope.mean_slope,
        std_slope=float(np.std(slope.data[slope.data != slope.nodata_value])),
        dominant_aspect=dominant[0],
        aspect_distribution=aspect_dist,
        buildable_area_percent=classified.buildable_percent,
        slope_class_distribution=classified.class_distribution,
    )


def generate_slope_visualization(
    slope: SlopeResult | ClassifiedSlopeResult,
    output_path: str | Path,
    colormap: str = "RdYlGn_r",
) -> Path:
    """
    Generate a color-coded slope visualization.

    Args:
        slope: Slope result (continuous or classified)
        output_path: Output file path
        colormap: Matplotlib colormap name

    Returns:
        Path to the generated file
    """
    import matplotlib.pyplot as plt
    from matplotlib import cm

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if isinstance(slope, ClassifiedSlopeResult):
        # Create colored raster from class indices
        data = slope.data.copy().astype(np.float64)
        data = np.where(data < 0, np.nan, data)

        # Create RGB image
        height, width = data.shape
        rgb = np.zeros((height, width, 3), dtype=np.uint8)

        for i, cls in enumerate(slope.classes):
            mask = slope.data == i
            rgb[mask] = cls.color

        # Save as PNG
        plt.figure(figsize=(12, 10))
        plt.imshow(rgb)
        plt.colorbar(label="Slope Class")
        plt.title("Slope Classification")
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
    else:
        # Continuous slope visualization
        data = slope.data.copy()
        data = np.where(data == slope.nodata_value, np.nan, data)

        plt.figure(figsize=(12, 10))
        cmap = cm.get_cmap(colormap)
        im = plt.imshow(data, cmap=cmap, vmin=0, vmax=min(30, slope.max_slope))
        plt.colorbar(im, label=f"Slope ({slope.unit.value})")
        plt.title("Slope Analysis")
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

    return output_path


def generate_aspect_visualization(
    aspect: AspectResult,
    output_path: str | Path,
) -> Path:
    """
    Generate a color-coded aspect visualization.

    Args:
        aspect: Aspect result
        output_path: Output file path

    Returns:
        Path to the generated file
    """
    import matplotlib.pyplot as plt
    from matplotlib import cm
    from matplotlib.colors import LinearSegmentedColormap

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = aspect.data.copy()
    data = np.where(data == aspect.nodata_value, np.nan, data)
    data = np.where(data < 0, np.nan, data)  # Mask flat areas

    # Use circular colormap for aspect
    plt.figure(figsize=(12, 10))
    cmap = cm.get_cmap('hsv')
    im = plt.imshow(data, cmap=cmap, vmin=0, vmax=360)
    cbar = plt.colorbar(im, label="Aspect (degrees from North)")
    cbar.set_ticks([0, 45, 90, 135, 180, 225, 270, 315, 360])
    cbar.set_ticklabels(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'])
    plt.title("Aspect Analysis")
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()

    return output_path


def identify_steep_areas(
    slope: SlopeResult,
    threshold: float = 15.0,
) -> NDArray[np.bool_]:
    """
    Identify areas exceeding a slope threshold.

    Args:
        slope: Slope result (should be in degrees)
        threshold: Slope threshold in degrees

    Returns:
        Boolean array where True indicates slope > threshold
    """
    data = slope.data.copy()
    nodata = slope.nodata_value

    # Create mask for steep areas
    steep_mask = (data > threshold) & (data != nodata)

    return steep_mask


def save_slope_as_geotiff(
    slope: SlopeResult,
    filepath: str | Path,
    create_cog: bool = True,
) -> Path:
    """Save slope result as GeoTIFF."""
    dem_result = slope.to_dem_result()
    return save_dem_as_geotiff(dem_result, filepath, create_cog=create_cog)


def save_aspect_as_geotiff(
    aspect: AspectResult,
    filepath: str | Path,
    create_cog: bool = True,
) -> Path:
    """Save aspect result as GeoTIFF."""
    dem_result = aspect.to_dem_result()
    return save_dem_as_geotiff(dem_result, filepath, create_cog=create_cog)
