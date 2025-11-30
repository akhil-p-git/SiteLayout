"""
Digital Elevation Model (DEM) Generator

Generates DEMs from contour data using TIN (Triangulated Irregular Network)
interpolation and exports to Cloud Optimized GeoTIFF (COG) format.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from scipy.spatial import Delaunay
from scipy.interpolate import LinearNDInterpolator, NearestNDInterpolator
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_bounds
from rasterio.enums import Resampling

from ..parsers.dxf_parser import ContourSet


@dataclass
class DEMConfig:
    """Configuration for DEM generation."""

    resolution: float = 1.0  # Pixel size in CRS units (usually meters)
    nodata_value: float = -9999.0
    crs: str = "EPSG:4326"
    interpolation_method: Literal["linear", "nearest", "cubic"] = "linear"
    sample_interval: float = 10.0  # Distance between contour sample points
    buffer: float = 0.0  # Buffer around bounds


@dataclass
class DEMResult:
    """Result of DEM generation."""

    data: NDArray[np.float64]
    transform: rasterio.Affine
    crs: CRS
    bounds: tuple[float, float, float, float]
    resolution: float
    nodata_value: float
    min_elevation: float
    max_elevation: float
    width: int
    height: int

    def get_elevation_at(self, x: float, y: float) -> float | None:
        """
        Get elevation at a specific coordinate.

        Args:
            x: X coordinate (longitude or easting)
            y: Y coordinate (latitude or northing)

        Returns:
            Elevation value or None if outside bounds
        """
        # Convert coordinates to pixel indices
        col, row = ~self.transform * (x, y)
        col, row = int(col), int(row)

        if 0 <= row < self.height and 0 <= col < self.width:
            value = self.data[row, col]
            if value != self.nodata_value:
                return float(value)

        return None

    def get_statistics(self) -> dict:
        """Get DEM statistics."""
        valid_data = self.data[self.data != self.nodata_value]

        if len(valid_data) == 0:
            return {"valid_pixels": 0}

        return {
            "valid_pixels": int(len(valid_data)),
            "total_pixels": int(self.data.size),
            "min_elevation": float(np.min(valid_data)),
            "max_elevation": float(np.max(valid_data)),
            "mean_elevation": float(np.mean(valid_data)),
            "std_elevation": float(np.std(valid_data)),
            "resolution": self.resolution,
        }


def _create_tin_interpolator(
    points: NDArray[np.float64],
    method: Literal["linear", "nearest", "cubic"] = "linear"
) -> LinearNDInterpolator | NearestNDInterpolator:
    """
    Create a TIN-based interpolator from 3D points.

    Args:
        points: Array of shape (N, 3) with (x, y, z) coordinates
        method: Interpolation method

    Returns:
        Interpolator function
    """
    xy = points[:, :2]  # X, Y coordinates
    z = points[:, 2]    # Elevation values

    if method == "nearest":
        return NearestNDInterpolator(xy, z)
    else:
        # Linear interpolation using Delaunay triangulation
        return LinearNDInterpolator(xy, z, fill_value=np.nan)


def generate_dem_from_contours(
    contour_set: ContourSet,
    config: DEMConfig | None = None,
) -> DEMResult:
    """
    Generate a DEM from contour lines using TIN interpolation.

    Args:
        contour_set: Set of contour lines with elevation data
        config: DEM generation configuration

    Returns:
        DEMResult containing the generated DEM

    Raises:
        ValueError: If insufficient points for interpolation
    """
    if config is None:
        config = DEMConfig()

    # Sample points from contours
    points = contour_set.get_all_points(sample_interval=config.sample_interval)

    if len(points) < 3:
        raise ValueError("Insufficient points for DEM generation (need at least 3)")

    # Calculate grid dimensions
    minx, miny, maxx, maxy = contour_set.bounds

    # Apply buffer
    minx -= config.buffer
    miny -= config.buffer
    maxx += config.buffer
    maxy += config.buffer

    width = int(np.ceil((maxx - minx) / config.resolution))
    height = int(np.ceil((maxy - miny) / config.resolution))

    # Create interpolator
    interpolator = _create_tin_interpolator(points, config.interpolation_method)

    # Create grid coordinates
    x_coords = np.linspace(minx, maxx, width)
    y_coords = np.linspace(maxy, miny, height)  # Note: Y is inverted for raster
    xx, yy = np.meshgrid(x_coords, y_coords)

    # Interpolate elevation values
    grid_points = np.column_stack([xx.ravel(), yy.ravel()])
    z_values = interpolator(grid_points)
    dem_data = z_values.reshape((height, width))

    # Replace NaN with nodata value
    dem_data = np.where(np.isnan(dem_data), config.nodata_value, dem_data)

    # Create affine transform
    transform = from_bounds(minx, miny, maxx, maxy, width, height)

    # Parse CRS
    crs = CRS.from_string(config.crs)

    # Calculate actual min/max from valid data
    valid_data = dem_data[dem_data != config.nodata_value]
    min_elev = float(np.min(valid_data)) if len(valid_data) > 0 else 0.0
    max_elev = float(np.max(valid_data)) if len(valid_data) > 0 else 0.0

    return DEMResult(
        data=dem_data.astype(np.float64),
        transform=transform,
        crs=crs,
        bounds=(minx, miny, maxx, maxy),
        resolution=config.resolution,
        nodata_value=config.nodata_value,
        min_elevation=min_elev,
        max_elevation=max_elev,
        width=width,
        height=height,
    )


def generate_dem_from_points(
    points: NDArray[np.float64],
    bounds: tuple[float, float, float, float],
    config: DEMConfig | None = None,
) -> DEMResult:
    """
    Generate a DEM from raw XYZ points.

    Args:
        points: Array of shape (N, 3) with (x, y, z) coordinates
        bounds: (minx, miny, maxx, maxy) bounds for the output DEM
        config: DEM generation configuration

    Returns:
        DEMResult containing the generated DEM
    """
    if config is None:
        config = DEMConfig()

    if len(points) < 3:
        raise ValueError("Insufficient points for DEM generation (need at least 3)")

    minx, miny, maxx, maxy = bounds

    # Apply buffer
    minx -= config.buffer
    miny -= config.buffer
    maxx += config.buffer
    maxy += config.buffer

    width = int(np.ceil((maxx - minx) / config.resolution))
    height = int(np.ceil((maxy - miny) / config.resolution))

    # Create interpolator
    interpolator = _create_tin_interpolator(points, config.interpolation_method)

    # Create grid and interpolate
    x_coords = np.linspace(minx, maxx, width)
    y_coords = np.linspace(maxy, miny, height)
    xx, yy = np.meshgrid(x_coords, y_coords)
    grid_points = np.column_stack([xx.ravel(), yy.ravel()])
    z_values = interpolator(grid_points)
    dem_data = z_values.reshape((height, width))

    # Replace NaN with nodata value
    dem_data = np.where(np.isnan(dem_data), config.nodata_value, dem_data)

    transform = from_bounds(minx, miny, maxx, maxy, width, height)
    crs = CRS.from_string(config.crs)

    valid_data = dem_data[dem_data != config.nodata_value]
    min_elev = float(np.min(valid_data)) if len(valid_data) > 0 else 0.0
    max_elev = float(np.max(valid_data)) if len(valid_data) > 0 else 0.0

    return DEMResult(
        data=dem_data.astype(np.float64),
        transform=transform,
        crs=crs,
        bounds=(minx, miny, maxx, maxy),
        resolution=config.resolution,
        nodata_value=config.nodata_value,
        min_elevation=min_elev,
        max_elevation=max_elev,
        width=width,
        height=height,
    )


def save_dem_as_geotiff(
    dem: DEMResult,
    filepath: str | Path,
    compress: bool = True,
    create_cog: bool = True,
) -> Path:
    """
    Save DEM as a GeoTIFF file.

    Args:
        dem: DEM result to save
        filepath: Output file path
        compress: Whether to apply compression
        create_cog: Whether to create a Cloud Optimized GeoTIFF

    Returns:
        Path to the saved file
    """
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)

    # Build profile
    profile = {
        'driver': 'GTiff',
        'dtype': 'float64',
        'width': dem.width,
        'height': dem.height,
        'count': 1,
        'crs': dem.crs,
        'transform': dem.transform,
        'nodata': dem.nodata_value,
    }

    if compress:
        profile['compress'] = 'deflate'
        profile['predictor'] = 2

    if create_cog:
        # COG-specific options
        profile['tiled'] = True
        profile['blockxsize'] = 512
        profile['blockysize'] = 512
        profile['interleave'] = 'band'

    # Write the file
    with rasterio.open(filepath, 'w', **profile) as dst:
        dst.write(dem.data, 1)

        # Add overviews for COG
        if create_cog:
            factors = [2, 4, 8, 16]
            dst.build_overviews(factors, Resampling.average)
            dst.update_tags(ns='rio_overview', resampling='average')

    return filepath


def load_dem_from_geotiff(filepath: str | Path) -> DEMResult:
    """
    Load a DEM from a GeoTIFF file.

    Args:
        filepath: Path to the GeoTIFF file

    Returns:
        DEMResult containing the loaded DEM
    """
    filepath = Path(filepath)

    with rasterio.open(filepath) as src:
        data = src.read(1)
        transform = src.transform
        crs = src.crs
        nodata = src.nodata or -9999.0
        bounds = src.bounds

        # Calculate resolution
        resolution = abs(transform.a)  # Pixel width

        valid_data = data[data != nodata]
        min_elev = float(np.min(valid_data)) if len(valid_data) > 0 else 0.0
        max_elev = float(np.max(valid_data)) if len(valid_data) > 0 else 0.0

        return DEMResult(
            data=data.astype(np.float64),
            transform=transform,
            crs=crs,
            bounds=(bounds.left, bounds.bottom, bounds.right, bounds.top),
            resolution=resolution,
            nodata_value=nodata,
            min_elevation=min_elev,
            max_elevation=max_elev,
            width=src.width,
            height=src.height,
        )


def resample_dem(
    dem: DEMResult,
    new_resolution: float,
    method: Resampling = Resampling.bilinear,
) -> DEMResult:
    """
    Resample a DEM to a new resolution.

    Args:
        dem: Input DEM
        new_resolution: Target resolution
        method: Resampling method

    Returns:
        Resampled DEM
    """
    scale_factor = dem.resolution / new_resolution

    new_width = int(dem.width * scale_factor)
    new_height = int(dem.height * scale_factor)

    # Create new array
    resampled_data = np.empty((new_height, new_width), dtype=np.float64)

    # Use rasterio for proper resampling
    from rasterio.warp import reproject

    new_transform = from_bounds(
        dem.bounds[0], dem.bounds[1],
        dem.bounds[2], dem.bounds[3],
        new_width, new_height
    )

    reproject(
        source=dem.data,
        destination=resampled_data,
        src_transform=dem.transform,
        src_crs=dem.crs,
        dst_transform=new_transform,
        dst_crs=dem.crs,
        resampling=method,
        src_nodata=dem.nodata_value,
        dst_nodata=dem.nodata_value,
    )

    valid_data = resampled_data[resampled_data != dem.nodata_value]
    min_elev = float(np.min(valid_data)) if len(valid_data) > 0 else 0.0
    max_elev = float(np.max(valid_data)) if len(valid_data) > 0 else 0.0

    return DEMResult(
        data=resampled_data,
        transform=new_transform,
        crs=dem.crs,
        bounds=dem.bounds,
        resolution=new_resolution,
        nodata_value=dem.nodata_value,
        min_elevation=min_elev,
        max_elevation=max_elev,
        width=new_width,
        height=new_height,
    )
