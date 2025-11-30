"""
Earthwork Volume Calculator

Calculates cut/fill volumes for asset pads and road alignments.
"""

import math
from typing import List, Optional, Tuple, Dict, Any
import numpy as np
from shapely.geometry import Polygon, LineString, box
from shapely.affinity import rotate, translate

from .models import (
    PadDesign,
    RoadDesign,
    VolumeResult,
    CostResult,
    HaulRoute,
    EarthworkSummary,
    SoilProperties,
    CostFactors,
    GradingMethod,
    DEFAULT_SOIL_PROPERTIES,
    DEFAULT_COST_FACTORS,
)


class VolumeCalculator:
    """
    Calculator for cut/fill volumes using grid-based method.

    Uses a DEM (Digital Elevation Model) to calculate the difference
    between existing terrain and proposed grading.
    """

    def __init__(
        self,
        dem_data: np.ndarray,
        dem_bounds: Tuple[float, float, float, float],  # (min_x, min_y, max_x, max_y)
        dem_resolution: float,
        soil_properties: SoilProperties = DEFAULT_SOIL_PROPERTIES,
        nodata_value: float = -9999.0,
    ):
        """
        Initialize the volume calculator.

        Args:
            dem_data: 2D numpy array of elevation values
            dem_bounds: (min_x, min_y, max_x, max_y) of the DEM
            dem_resolution: Pixel size in map units (meters)
            soil_properties: Soil properties for shrink/swell factors
            nodata_value: Value indicating no data in DEM
        """
        self.dem_data = dem_data
        self.dem_bounds = dem_bounds
        self.dem_resolution = dem_resolution
        self.soil_properties = soil_properties
        self.nodata_value = nodata_value

        # Calculate transform parameters
        self.min_x, self.min_y, self.max_x, self.max_y = dem_bounds
        self.height, self.width = dem_data.shape

    def _world_to_pixel(self, x: float, y: float) -> Tuple[int, int]:
        """Convert world coordinates to pixel indices."""
        col = int((x - self.min_x) / self.dem_resolution)
        row = int((self.max_y - y) / self.dem_resolution)
        return row, col

    def _pixel_to_world(self, row: int, col: int) -> Tuple[float, float]:
        """Convert pixel indices to world coordinates (cell center)."""
        x = self.min_x + (col + 0.5) * self.dem_resolution
        y = self.max_y - (row + 0.5) * self.dem_resolution
        return x, y

    def _get_elevation_at(self, x: float, y: float) -> Optional[float]:
        """Get elevation at world coordinates."""
        row, col = self._world_to_pixel(x, y)
        if 0 <= row < self.height and 0 <= col < self.width:
            elev = self.dem_data[row, col]
            if elev != self.nodata_value:
                return float(elev)
        return None

    def _create_pad_polygon(self, pad: PadDesign) -> Polygon:
        """Create a polygon for the pad footprint."""
        width, length = pad.dimensions
        half_w = width / 2
        half_l = length / 2

        # Create rectangle centered at origin
        rect = box(-half_w, -half_l, half_w, half_l)

        # Rotate around center
        if pad.rotation != 0:
            rect = rotate(rect, pad.rotation, origin=(0, 0))

        # Translate to position
        rect = translate(rect, pad.position[0], pad.position[1])

        return rect

    def _get_optimal_elevation(
        self,
        polygon: Polygon,
        method: GradingMethod = GradingMethod.LEVEL,
    ) -> float:
        """
        Determine optimal design elevation for a pad to minimize earthwork.

        For LEVEL grading, finds the elevation that minimizes total cut/fill.
        """
        # Get all elevation samples within the polygon
        minx, miny, maxx, maxy = polygon.bounds
        elevations = []

        row_start, col_start = self._world_to_pixel(minx, maxy)
        row_end, col_end = self._world_to_pixel(maxx, miny)

        for row in range(max(0, row_start), min(self.height, row_end + 1)):
            for col in range(max(0, col_start), min(self.width, col_end + 1)):
                x, y = self._pixel_to_world(row, col)
                from shapely.geometry import Point
                if polygon.contains(Point(x, y)):
                    elev = self.dem_data[row, col]
                    if elev != self.nodata_value:
                        elevations.append(elev)

        if not elevations:
            return 0.0

        # For balanced cut/fill, use mean elevation
        # This minimizes total earthwork volume
        return float(np.mean(elevations))

    def calculate_pad_volume(self, pad: PadDesign) -> VolumeResult:
        """
        Calculate cut/fill volumes for a single pad.

        Args:
            pad: Pad design parameters

        Returns:
            VolumeResult with calculated volumes
        """
        # Create pad polygon with buffer for grading
        pad_polygon = self._create_pad_polygon(pad)
        buffered_polygon = pad_polygon.buffer(pad.buffer_distance)

        # Determine design elevation
        if pad.target_elevation is not None:
            design_elevation = pad.target_elevation
        else:
            design_elevation = self._get_optimal_elevation(
                pad_polygon, pad.grading_method
            )

        # Calculate volumes using grid method
        minx, miny, maxx, maxy = buffered_polygon.bounds

        cut_volume = 0.0
        fill_volume = 0.0
        cut_depths = []
        fill_depths = []
        existing_elevations = []
        cell_area = self.dem_resolution ** 2
        cell_count = 0

        row_start, col_start = self._world_to_pixel(minx, maxy)
        row_end, col_end = self._world_to_pixel(maxx, miny)

        from shapely.geometry import Point

        for row in range(max(0, row_start), min(self.height, row_end + 1)):
            for col in range(max(0, col_start), min(self.width, col_end + 1)):
                x, y = self._pixel_to_world(row, col)
                point = Point(x, y)

                if not buffered_polygon.contains(point):
                    continue

                existing_elev = self.dem_data[row, col]
                if existing_elev == self.nodata_value:
                    continue

                cell_count += 1
                existing_elevations.append(existing_elev)

                # Calculate difference
                diff = existing_elev - design_elevation

                if diff > 0:
                    # Cut required (existing ground higher than design)
                    cut_volume += diff * cell_area
                    cut_depths.append(diff)
                elif diff < 0:
                    # Fill required (existing ground lower than design)
                    fill_volume += abs(diff) * cell_area
                    fill_depths.append(abs(diff))

        # Calculate adjusted volumes with shrink/swell factors
        adjusted_cut = cut_volume * self.soil_properties.shrink_factor
        adjusted_fill = fill_volume * self.soil_properties.swell_factor

        # Calculate statistics
        area = cell_count * cell_area
        avg_cut = np.mean(cut_depths) if cut_depths else 0.0
        avg_fill = np.mean(fill_depths) if fill_depths else 0.0
        max_cut = max(cut_depths) if cut_depths else 0.0
        max_fill = max(fill_depths) if fill_depths else 0.0

        elev_range = (
            min(existing_elevations) if existing_elevations else 0.0,
            max(existing_elevations) if existing_elevations else 0.0,
        )

        return VolumeResult(
            element_id=pad.asset_id,
            element_type="pad",
            cut_volume=cut_volume,
            fill_volume=fill_volume,
            net_volume=cut_volume - fill_volume,
            adjusted_cut=adjusted_cut,
            adjusted_fill=adjusted_fill,
            adjusted_net=adjusted_cut - adjusted_fill,
            area=area,
            average_cut_depth=float(avg_cut),
            average_fill_depth=float(avg_fill),
            max_cut_depth=float(max_cut),
            max_fill_depth=float(max_fill),
            existing_elevation_range=elev_range,
            design_elevation=design_elevation,
        )

    def calculate_road_volume(self, road: RoadDesign) -> VolumeResult:
        """
        Calculate cut/fill volumes for a road segment.

        Args:
            road: Road design parameters

        Returns:
            VolumeResult with calculated volumes
        """
        # Create road corridor polygon
        start = road.start_point
        end = road.end_point
        line = LineString([start, end])

        total_width = road.width + 2 * road.shoulder_width
        road_polygon = line.buffer(total_width / 2, cap_style=2)  # Flat ends

        # Calculate road length and profile
        road_length = line.length

        # Get elevation profile along road centerline
        num_samples = max(10, int(road_length / self.dem_resolution))
        profile_points = []

        for i in range(num_samples + 1):
            fraction = i / num_samples
            point = line.interpolate(fraction, normalized=True)
            elev = self._get_elevation_at(point.x, point.y)
            if elev is not None:
                profile_points.append((fraction * road_length, elev))

        if not profile_points:
            return VolumeResult(
                element_id=road.segment_id,
                element_type="road",
                cut_volume=0, fill_volume=0, net_volume=0,
                adjusted_cut=0, adjusted_fill=0, adjusted_net=0,
                area=0, average_cut_depth=0, average_fill_depth=0,
                max_cut_depth=0, max_fill_depth=0,
                existing_elevation_range=(0, 0),
                design_elevation=0,
            )

        # Determine design profile
        # For now, use linear interpolation between endpoints
        start_elev = profile_points[0][1]
        end_elev = profile_points[-1][1]

        # Check if grade exceeds maximum
        existing_grade = abs(end_elev - start_elev) / road_length * 100

        if road.target_grade is not None:
            # Use specified grade
            grade = road.target_grade / 100
        elif existing_grade <= road.max_grade:
            # Follow terrain
            grade = (end_elev - start_elev) / road_length
        else:
            # Limit to max grade
            grade = (road.max_grade / 100) * (1 if end_elev > start_elev else -1)

        # Calculate volumes using grid method
        minx, miny, maxx, maxy = road_polygon.bounds

        cut_volume = 0.0
        fill_volume = 0.0
        cut_depths = []
        fill_depths = []
        existing_elevations = []
        cell_area = self.dem_resolution ** 2
        cell_count = 0

        row_start, col_start = self._world_to_pixel(minx, maxy)
        row_end, col_end = self._world_to_pixel(maxx, miny)

        from shapely.geometry import Point

        for row in range(max(0, row_start), min(self.height, row_end + 1)):
            for col in range(max(0, col_start), min(self.width, col_end + 1)):
                x, y = self._pixel_to_world(row, col)
                point = Point(x, y)

                if not road_polygon.contains(point):
                    continue

                existing_elev = self.dem_data[row, col]
                if existing_elev == self.nodata_value:
                    continue

                cell_count += 1
                existing_elevations.append(existing_elev)

                # Calculate distance along road for design elevation
                distance_along = line.project(point)
                design_elev = start_elev + grade * distance_along

                # Calculate difference
                diff = existing_elev - design_elev

                if diff > 0:
                    cut_volume += diff * cell_area
                    cut_depths.append(diff)
                elif diff < 0:
                    fill_volume += abs(diff) * cell_area
                    fill_depths.append(abs(diff))

        # Calculate adjusted volumes
        adjusted_cut = cut_volume * self.soil_properties.shrink_factor
        adjusted_fill = fill_volume * self.soil_properties.swell_factor

        # Calculate statistics
        area = cell_count * cell_area
        avg_cut = np.mean(cut_depths) if cut_depths else 0.0
        avg_fill = np.mean(fill_depths) if fill_depths else 0.0
        max_cut = max(cut_depths) if cut_depths else 0.0
        max_fill = max(fill_depths) if fill_depths else 0.0

        elev_range = (
            min(existing_elevations) if existing_elevations else 0.0,
            max(existing_elevations) if existing_elevations else 0.0,
        )

        avg_design_elev = (start_elev + end_elev) / 2

        return VolumeResult(
            element_id=road.segment_id,
            element_type="road",
            cut_volume=cut_volume,
            fill_volume=fill_volume,
            net_volume=cut_volume - fill_volume,
            adjusted_cut=adjusted_cut,
            adjusted_fill=adjusted_fill,
            adjusted_net=adjusted_cut - adjusted_fill,
            area=area,
            average_cut_depth=float(avg_cut),
            average_fill_depth=float(avg_fill),
            max_cut_depth=float(max_cut),
            max_fill_depth=float(max_fill),
            existing_elevation_range=elev_range,
            design_elevation=avg_design_elev,
        )


def calculate_haul_routes(
    results: List[VolumeResult],
    max_haul_distance: float = 1000.0,
) -> List[HaulRoute]:
    """
    Calculate optimal haul routes between cut and fill areas.

    Pairs areas with excess cut to areas needing fill based on
    proximity and volume requirements.
    """
    # Separate into cut sources and fill destinations
    cut_sources = []  # (id, x, y, available_volume)
    fill_destinations = []  # (id, x, y, required_volume)

    for result in results:
        if result.adjusted_net > 0:
            # Excess cut available
            cut_sources.append({
                "id": result.element_id,
                "volume": result.adjusted_net,
            })
        elif result.adjusted_net < 0:
            # Fill required
            fill_destinations.append({
                "id": result.element_id,
                "volume": abs(result.adjusted_net),
            })

    haul_routes = []

    # Simple greedy matching (could be optimized with transportation problem solver)
    for dest in fill_destinations:
        remaining_fill = dest["volume"]

        for source in cut_sources:
            if source["volume"] <= 0 or remaining_fill <= 0:
                continue

            # Calculate haul distance (simplified - would use actual positions)
            # For now, estimate based on typical site dimensions
            haul_distance = 200.0  # Placeholder

            # Determine volume to haul
            haul_volume = min(source["volume"], remaining_fill)

            if haul_distance <= max_haul_distance:
                haul_routes.append(HaulRoute(
                    source_id=source["id"],
                    destination_id=dest["id"],
                    distance_m=haul_distance,
                    volume_m3=haul_volume,
                ))

                source["volume"] -= haul_volume
                remaining_fill -= haul_volume

    return haul_routes


def calculate_costs(
    summary: EarthworkSummary,
    cost_factors: CostFactors = DEFAULT_COST_FACTORS,
) -> CostResult:
    """
    Calculate cost estimates for earthwork.

    Args:
        summary: Earthwork summary with volumes
        cost_factors: Cost factors to apply

    Returns:
        CostResult with itemized costs
    """
    # Cut costs
    cut_cost = cost_factors.calculate_cut_cost(summary.adjusted_total_cut)

    # Fill costs
    fill_cost = cost_factors.calculate_fill_cost(summary.adjusted_total_fill)

    # Haul costs
    haul_cost = 0.0
    for route in summary.haul_routes:
        haul_cost += cost_factors.calculate_haul_cost(
            route.volume_m3,
            route.distance_m / 1000,  # Convert to km
        )

    # Import/export costs
    import_cost = summary.import_required * cost_factors.import_cost_per_m3
    export_cost = summary.export_required * cost_factors.export_cost_per_m3

    total_cost = cut_cost + fill_cost + haul_cost + import_cost + export_cost

    return CostResult(
        cut_cost=cut_cost,
        fill_cost=fill_cost,
        haul_cost=haul_cost,
        import_cost=import_cost,
        export_cost=export_cost,
        total_cost=total_cost,
    )


def calculate_earthwork(
    project_id: str,
    dem_data: np.ndarray,
    dem_bounds: Tuple[float, float, float, float],
    dem_resolution: float,
    pads: List[PadDesign],
    roads: List[RoadDesign],
    soil_properties: SoilProperties = DEFAULT_SOIL_PROPERTIES,
    cost_factors: CostFactors = DEFAULT_COST_FACTORS,
    nodata_value: float = -9999.0,
) -> EarthworkSummary:
    """
    Calculate complete earthwork analysis for a project.

    Args:
        project_id: Project identifier
        dem_data: DEM elevation array
        dem_bounds: DEM spatial bounds
        dem_resolution: DEM pixel size
        pads: List of pad designs
        roads: List of road designs
        soil_properties: Soil properties for calculations
        cost_factors: Cost factors for estimation
        nodata_value: NoData value in DEM

    Returns:
        EarthworkSummary with all calculations
    """
    calculator = VolumeCalculator(
        dem_data=dem_data,
        dem_bounds=dem_bounds,
        dem_resolution=dem_resolution,
        soil_properties=soil_properties,
        nodata_value=nodata_value,
    )

    # Calculate pad volumes
    pad_results = [calculator.calculate_pad_volume(pad) for pad in pads]

    # Calculate road volumes
    road_results = [calculator.calculate_road_volume(road) for road in roads]

    # Combine all results
    all_results = pad_results + road_results

    # Calculate totals
    total_cut = sum(r.cut_volume for r in all_results)
    total_fill = sum(r.fill_volume for r in all_results)
    adjusted_cut = sum(r.adjusted_cut for r in all_results)
    adjusted_fill = sum(r.adjusted_fill for r in all_results)

    # Calculate material balance
    if adjusted_cut > adjusted_fill:
        export_required = adjusted_cut - adjusted_fill
        import_required = 0.0
        balance_on_site = adjusted_fill
    else:
        import_required = adjusted_fill - adjusted_cut
        export_required = 0.0
        balance_on_site = adjusted_cut

    # Calculate haul routes
    haul_routes = calculate_haul_routes(all_results)

    # Create summary
    summary = EarthworkSummary(
        project_id=project_id,
        total_cut_volume=total_cut,
        total_fill_volume=total_fill,
        total_net_volume=total_cut - total_fill,
        adjusted_total_cut=adjusted_cut,
        adjusted_total_fill=adjusted_fill,
        adjusted_net=adjusted_cut - adjusted_fill,
        import_required=import_required,
        export_required=export_required,
        balance_on_site=balance_on_site,
        pad_results=pad_results,
        road_results=road_results,
        haul_routes=haul_routes,
    )

    # Calculate costs
    summary.cost_estimate = calculate_costs(summary, cost_factors)

    return summary
