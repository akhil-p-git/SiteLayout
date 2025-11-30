"""
DXF Contour File Parser

Parses DXF files containing contour lines and extracts elevation data
for DEM generation.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import ezdxf
import numpy as np
from ezdxf.entities import Line, LWPolyline, Polyline, Spline
from numpy.typing import NDArray
from shapely.geometry import LineString


@dataclass
class ContourLine:
    """Represents a single contour line with elevation."""

    elevation: float
    geometry: LineString
    layer: str

    @property
    def coordinates(self) -> NDArray[np.float64]:
        """Get coordinates as numpy array."""
        return np.array(self.geometry.coords)

    @property
    def length(self) -> float:
        """Get length of contour line in coordinate units."""
        return self.geometry.length

    def sample_points(self, interval: float) -> list[tuple[float, float, float]]:
        """
        Sample points along the contour at regular intervals.

        Args:
            interval: Distance between sample points

        Returns:
            List of (x, y, z) tuples
        """
        points: list[tuple[float, float, float]] = []
        distance = 0.0
        total_length = self.length

        while distance <= total_length:
            point = self.geometry.interpolate(distance)
            points.append((point.x, point.y, self.elevation))
            distance += interval

        return points


@dataclass
class ContourSet:
    """Collection of contour lines from a DXF file."""

    contours: list[ContourLine]
    min_elevation: float
    max_elevation: float
    contour_interval: float | None
    bounds: tuple[float, float, float, float]  # minx, miny, maxx, maxy
    crs: str | None

    @property
    def elevation_range(self) -> float:
        """Get the elevation range."""
        return self.max_elevation - self.min_elevation

    def get_all_points(self, sample_interval: float = 10.0) -> NDArray[np.float64]:
        """
        Get all elevation points from contours.

        Args:
            sample_interval: Distance between sample points on contours

        Returns:
            Numpy array of shape (N, 3) with (x, y, z) coordinates
        """
        all_points: list[tuple[float, float, float]] = []

        for contour in self.contours:
            points = contour.sample_points(sample_interval)
            all_points.extend(points)

        return np.array(all_points, dtype=np.float64)

    def filter_by_elevation(
        self, min_elev: float | None = None, max_elev: float | None = None
    ) -> list[ContourLine]:
        """Filter contours by elevation range."""
        result = self.contours

        if min_elev is not None:
            result = [c for c in result if c.elevation >= min_elev]
        if max_elev is not None:
            result = [c for c in result if c.elevation <= max_elev]

        return result


def _extract_elevation_from_entity(entity: ezdxf.entities.DXFEntity) -> float | None:
    """
    Extract elevation from a DXF entity.

    Tries multiple methods:
    1. Z-coordinate of first vertex
    2. Elevation attribute
    3. Layer name parsing (e.g., "CONTOUR_100" -> 100)
    """
    # Try Z-coordinate
    if hasattr(entity, "vertices"):
        vertices = list(entity.vertices())
        if vertices and len(vertices[0]) >= 3:
            return float(vertices[0][2])

    # Try elevation attribute
    if hasattr(entity, "dxf") and hasattr(entity.dxf, "elevation"):
        elev = entity.dxf.elevation
        if elev != 0:
            return float(elev)

    # Try to get from first point's Z
    if hasattr(entity, "dxf"):
        if hasattr(entity.dxf, "start") and len(entity.dxf.start) >= 3:
            return float(entity.dxf.start[2])

    return None


def _extract_elevation_from_layer(layer_name: str) -> float | None:
    """Try to extract elevation from layer name."""
    import re

    # Common patterns: "CONTOUR_100", "ELEV-100", "100m", "C100"
    patterns = [
        r"[-_](\d+(?:\.\d+)?)\s*$",  # suffix number
        r"^(\d+(?:\.\d+)?)[-_m]",  # prefix number
        r"[Cc](\d+(?:\.\d+)?)",  # C followed by number
        r"(\d+(?:\.\d+)?)",  # any number
    ]

    for pattern in patterns:
        match = re.search(pattern, layer_name)
        if match:
            return float(match.group(1))

    return None


def _entity_to_linestring(entity: ezdxf.entities.DXFEntity) -> LineString | None:
    """Convert a DXF entity to a Shapely LineString."""
    coords: list[tuple[float, float]] = []

    if isinstance(entity, LWPolyline):
        # Lightweight polyline
        for x, y, *_ in entity.get_points():
            coords.append((x, y))
        if entity.closed and len(coords) > 0:
            coords.append(coords[0])

    elif isinstance(entity, Polyline):
        # 3D Polyline
        for vertex in entity.vertices:
            loc = vertex.dxf.location
            coords.append((loc[0], loc[1]))
        if entity.is_closed and len(coords) > 0:
            coords.append(coords[0])

    elif isinstance(entity, Line):
        start = entity.dxf.start
        end = entity.dxf.end
        coords = [(start[0], start[1]), (end[0], end[1])]

    elif isinstance(entity, Spline):
        # Sample spline at regular intervals
        try:
            points = list(entity.flattening(0.1))
            coords = [(p[0], p[1]) for p in points]
        except Exception:
            return None

    if len(coords) < 2:
        return None

    return LineString(coords)


def parse_dxf(
    filepath: str | Path,
    layer_filter: Sequence[str] | None = None,
    elevation_attribute: str | None = None,
) -> ContourSet:
    """
    Parse a DXF file and extract contour lines.

    Args:
        filepath: Path to the DXF file
        layer_filter: Optional list of layer names to include
        elevation_attribute: Optional attribute name for elevation data

    Returns:
        ContourSet containing all extracted contours

    Raises:
        ValueError: If no contours could be extracted
        FileNotFoundError: If the file doesn't exist
    """
    filepath = Path(filepath)

    if not filepath.exists():
        raise FileNotFoundError(f"DXF file not found: {filepath}")

    doc = ezdxf.readfile(str(filepath))
    msp = doc.modelspace()

    contours: list[ContourLine] = []
    elevations: set[float] = set()

    # Collect all line-type entities
    entity_types = ["LWPOLYLINE", "POLYLINE", "LINE", "SPLINE"]

    for entity_type in entity_types:
        for entity in msp.query(entity_type):
            # Filter by layer if specified
            if layer_filter and entity.dxf.layer not in layer_filter:
                continue

            # Extract elevation
            elevation = None

            # Try custom attribute first
            if elevation_attribute and hasattr(entity.dxf, elevation_attribute):
                elevation = float(getattr(entity.dxf, elevation_attribute))

            # Try standard methods
            if elevation is None:
                elevation = _extract_elevation_from_entity(entity)

            # Try layer name
            if elevation is None:
                elevation = _extract_elevation_from_layer(entity.dxf.layer)

            # Skip if no elevation found
            if elevation is None:
                continue

            # Convert to LineString
            geometry = _entity_to_linestring(entity)
            if geometry is None:
                continue

            contour = ContourLine(
                elevation=elevation,
                geometry=geometry,
                layer=entity.dxf.layer,
            )

            contours.append(contour)
            elevations.add(elevation)

    if not contours:
        raise ValueError("No contours with elevation data found in DXF file")

    # Calculate bounds
    all_bounds = [c.geometry.bounds for c in contours]
    minx = min(b[0] for b in all_bounds)
    miny = min(b[1] for b in all_bounds)
    maxx = max(b[2] for b in all_bounds)
    maxy = max(b[3] for b in all_bounds)

    # Detect contour interval
    sorted_elevs = sorted(elevations)
    if len(sorted_elevs) > 1:
        intervals = [
            sorted_elevs[i + 1] - sorted_elevs[i] for i in range(len(sorted_elevs) - 1)
        ]
        # Most common interval
        from collections import Counter

        rounded_intervals = [round(i, 1) for i in intervals]
        interval_counts = Counter(rounded_intervals)
        contour_interval = interval_counts.most_common(1)[0][0]
    else:
        contour_interval = None

    return ContourSet(
        contours=contours,
        min_elevation=min(elevations),
        max_elevation=max(elevations),
        contour_interval=contour_interval,
        bounds=(minx, miny, maxx, maxy),
        crs=None,  # DXF doesn't typically include CRS info
    )


def parse_dxf_with_layers(filepath: str | Path) -> dict[str, ContourSet]:
    """
    Parse DXF file and return contours grouped by layer.

    Args:
        filepath: Path to the DXF file

    Returns:
        Dictionary mapping layer names to ContourSets
    """
    filepath = Path(filepath)
    doc = ezdxf.readfile(str(filepath))

    # Get all layers
    layers = [layer.dxf.name for layer in doc.layers]

    result: dict[str, ContourSet] = {}

    for layer in layers:
        try:
            contour_set = parse_dxf(filepath, layer_filter=[layer])
            if contour_set.contours:
                result[layer] = contour_set
        except ValueError:
            # No contours in this layer
            continue

    return result


def get_dxf_info(filepath: str | Path) -> dict:
    """
    Get basic information about a DXF file without full parsing.

    Args:
        filepath: Path to the DXF file

    Returns:
        Dictionary with file information
    """
    filepath = Path(filepath)
    doc = ezdxf.readfile(str(filepath))
    msp = doc.modelspace()

    # Count entities by type
    entity_counts: dict[str, int] = {}
    for entity in msp:
        entity_type = entity.dxftype()
        entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1

    # Get layers
    layers = [layer.dxf.name for layer in doc.layers]

    # Get units if available
    units = None
    if hasattr(doc.header, "get"):
        units = doc.header.get("$INSUNITS", None)

    return {
        "filepath": str(filepath),
        "version": doc.dxfversion,
        "layers": layers,
        "entity_counts": entity_counts,
        "units": units,
    }
