"""
A* Pathfinding for Road Network Generation

Implements terrain-aware A* pathfinding algorithm for generating
optimal road routes that respect slope constraints and avoid exclusion zones.
"""

import heapq
import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Set, Dict, Any
from enum import Enum
from shapely.geometry import Point, LineString, Polygon, MultiPolygon
from shapely.ops import unary_union


class CostFactorType(Enum):
    """Types of cost factors for pathfinding."""
    DISTANCE = "distance"
    SLOPE = "slope"
    TURN = "turn"
    CROSSING = "crossing"


@dataclass
class PathfindingConfig:
    """Configuration for A* pathfinding."""
    grid_resolution: float = 5.0  # meters per grid cell
    max_gradient: float = 12.0  # percent (rise/run * 100)
    road_width: float = 6.0  # meters
    min_turn_radius: float = 15.0  # meters

    # Cost weights
    distance_weight: float = 1.0
    slope_weight: float = 2.0
    turn_weight: float = 0.5

    # Penalties
    steep_slope_penalty: float = 10.0  # Applied when slope > max_gradient * 0.8
    exclusion_penalty: float = float('inf')  # Cannot cross exclusion zones

    # Algorithm settings
    diagonal_movement: bool = True
    smooth_path: bool = True
    smooth_iterations: int = 3


@dataclass
class PathNode:
    """Node in the pathfinding grid."""
    x: int
    y: int
    g_cost: float = float('inf')  # Cost from start
    h_cost: float = 0.0  # Heuristic cost to end
    parent: Optional['PathNode'] = None

    @property
    def f_cost(self) -> float:
        """Total cost (g + h)."""
        return self.g_cost + self.h_cost

    def __lt__(self, other: 'PathNode') -> bool:
        return self.f_cost < other.f_cost

    def __hash__(self) -> int:
        return hash((self.x, self.y))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, PathNode):
            return False
        return self.x == other.x and self.y == other.y


@dataclass
class RoadSegment:
    """A segment of road between two points."""
    start: Tuple[float, float]
    end: Tuple[float, float]
    length: float
    gradient: float  # percent
    direction: float  # degrees

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start": {"x": self.start[0], "y": self.start[1]},
            "end": {"x": self.end[0], "y": self.end[1]},
            "length": self.length,
            "gradient": self.gradient,
            "direction": self.direction,
        }


@dataclass
class RoadPath:
    """A complete road path from start to end."""
    path_id: str
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]
    waypoints: List[Tuple[float, float]]
    segments: List[RoadSegment]
    total_length: float
    max_gradient: float
    avg_gradient: float
    geometry: LineString

    def to_dict(self) -> Dict[str, Any]:
        return {
            "path_id": self.path_id,
            "start_point": {"x": self.start_point[0], "y": self.start_point[1]},
            "end_point": {"x": self.end_point[0], "y": self.end_point[1]},
            "waypoints": [{"x": p[0], "y": p[1]} for p in self.waypoints],
            "segments": [s.to_dict() for s in self.segments],
            "total_length": self.total_length,
            "max_gradient": self.max_gradient,
            "avg_gradient": self.avg_gradient,
            "geometry": {
                "type": "LineString",
                "coordinates": list(self.geometry.coords),
            },
        }


@dataclass
class RoadNetwork:
    """Complete road network for a site."""
    network_id: str
    entry_point: Tuple[float, float]
    paths: List[RoadPath]
    total_length: float
    coverage_area: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "network_id": self.network_id,
            "entry_point": {"x": self.entry_point[0], "y": self.entry_point[1]},
            "paths": [p.to_dict() for p in self.paths],
            "total_length": self.total_length,
            "coverage_area": self.coverage_area,
        }


class TerrainAwarePathfinder:
    """
    A* pathfinding with terrain awareness.

    Uses elevation data to calculate slope costs and respects
    maximum gradient constraints for road routing.
    """

    def __init__(
        self,
        boundary: Polygon,
        elevation_data: Optional[np.ndarray] = None,
        slope_data: Optional[np.ndarray] = None,
        exclusion_zones: Optional[List[Polygon]] = None,
        config: Optional[PathfindingConfig] = None,
        bounds: Optional[Tuple[float, float, float, float]] = None,
    ):
        self.boundary = boundary
        self.elevation_data = elevation_data
        self.slope_data = slope_data
        self.exclusion_zones = exclusion_zones or []
        self.config = config or PathfindingConfig()

        # Get bounds
        if bounds:
            self.min_x, self.min_y, self.max_x, self.max_y = bounds
        else:
            self.min_x, self.min_y, self.max_x, self.max_y = boundary.bounds

        self.width = self.max_x - self.min_x
        self.height = self.max_y - self.min_y

        # Calculate grid dimensions
        self.grid_cols = int(np.ceil(self.width / self.config.grid_resolution))
        self.grid_rows = int(np.ceil(self.height / self.config.grid_resolution))

        # Pre-compute exclusion zone mask
        self._build_exclusion_mask()

        # Pre-compute slope cost grid if slope data available
        self._build_cost_grid()

    def _build_exclusion_mask(self):
        """Build a binary mask of exclusion zones."""
        self.exclusion_mask = np.zeros((self.grid_rows, self.grid_cols), dtype=bool)

        if not self.exclusion_zones:
            return

        exclusion_union = unary_union(self.exclusion_zones)

        for row in range(self.grid_rows):
            for col in range(self.grid_cols):
                x, y = self._grid_to_world(col, row)
                # Check if point is in exclusion zone (with buffer for road width)
                point = Point(x, y)
                if exclusion_union.contains(point) or exclusion_union.distance(point) < self.config.road_width / 2:
                    self.exclusion_mask[row, col] = True

        # Also mask areas outside boundary
        for row in range(self.grid_rows):
            for col in range(self.grid_cols):
                x, y = self._grid_to_world(col, row)
                if not self.boundary.contains(Point(x, y)):
                    self.exclusion_mask[row, col] = True

    def _build_cost_grid(self):
        """Build cost grid based on slope data."""
        self.cost_grid = np.ones((self.grid_rows, self.grid_cols))

        if self.slope_data is None:
            return

        # Resample slope data to match grid resolution
        slope_rows, slope_cols = self.slope_data.shape

        for row in range(self.grid_rows):
            for col in range(self.grid_cols):
                # Map grid cell to slope data
                slope_row = int(row * slope_rows / self.grid_rows)
                slope_col = int(col * slope_cols / self.grid_cols)

                slope_row = min(slope_row, slope_rows - 1)
                slope_col = min(slope_col, slope_cols - 1)

                slope = self.slope_data[slope_row, slope_col]

                # Convert slope from degrees to percent if needed
                if slope < 45:  # Assuming it's in degrees
                    slope_percent = np.tan(np.radians(slope)) * 100
                else:
                    slope_percent = slope

                # Calculate cost multiplier
                if slope_percent > self.config.max_gradient:
                    # Heavily penalize but don't make impossible
                    self.cost_grid[row, col] = self.config.steep_slope_penalty
                elif slope_percent > self.config.max_gradient * 0.8:
                    # Moderate penalty for slopes approaching limit
                    self.cost_grid[row, col] = 1.0 + (slope_percent / self.config.max_gradient) * self.config.slope_weight
                else:
                    # Normal cost based on slope
                    self.cost_grid[row, col] = 1.0 + (slope_percent / self.config.max_gradient) * self.config.slope_weight * 0.5

    def _grid_to_world(self, col: int, row: int) -> Tuple[float, float]:
        """Convert grid coordinates to world coordinates."""
        x = self.min_x + col * self.config.grid_resolution
        y = self.max_y - row * self.config.grid_resolution  # Y is inverted
        return (x, y)

    def _world_to_grid(self, x: float, y: float) -> Tuple[int, int]:
        """Convert world coordinates to grid coordinates."""
        col = int((x - self.min_x) / self.config.grid_resolution)
        row = int((self.max_y - y) / self.config.grid_resolution)
        col = max(0, min(col, self.grid_cols - 1))
        row = max(0, min(row, self.grid_rows - 1))
        return (col, row)

    def _get_neighbors(self, node: PathNode) -> List[Tuple[PathNode, float]]:
        """Get valid neighboring nodes with movement costs."""
        neighbors = []

        # 8-directional movement if diagonal allowed, else 4-directional
        if self.config.diagonal_movement:
            directions = [
                (-1, -1), (0, -1), (1, -1),
                (-1, 0),          (1, 0),
                (-1, 1),  (0, 1),  (1, 1),
            ]
        else:
            directions = [(0, -1), (-1, 0), (1, 0), (0, 1)]

        for dx, dy in directions:
            nx, ny = node.x + dx, node.y + dy

            # Check bounds
            if not (0 <= nx < self.grid_cols and 0 <= ny < self.grid_rows):
                continue

            # Check exclusion zones
            if self.exclusion_mask[ny, nx]:
                continue

            # Calculate movement cost
            if dx != 0 and dy != 0:
                # Diagonal movement
                base_cost = np.sqrt(2) * self.config.grid_resolution
            else:
                base_cost = self.config.grid_resolution

            # Apply terrain cost
            terrain_cost = self.cost_grid[ny, nx]

            # Calculate turn penalty
            turn_cost = 0.0
            if node.parent:
                prev_dx = node.x - node.parent.x
                prev_dy = node.y - node.parent.y
                if (dx, dy) != (prev_dx, prev_dy):
                    turn_cost = self.config.turn_weight * base_cost

            total_cost = (base_cost * terrain_cost * self.config.distance_weight +
                         turn_cost)

            neighbor = PathNode(nx, ny)
            neighbors.append((neighbor, total_cost))

        return neighbors

    def _heuristic(self, node: PathNode, goal: PathNode) -> float:
        """Calculate heuristic distance to goal."""
        dx = abs(node.x - goal.x)
        dy = abs(node.y - goal.y)

        if self.config.diagonal_movement:
            # Octile distance
            return self.config.grid_resolution * (max(dx, dy) + 0.414 * min(dx, dy))
        else:
            # Manhattan distance
            return self.config.grid_resolution * (dx + dy)

    def find_path(
        self,
        start: Tuple[float, float],
        end: Tuple[float, float],
    ) -> Optional[List[Tuple[float, float]]]:
        """
        Find optimal path between two points using A*.

        Args:
            start: Start point (x, y) in world coordinates
            end: End point (x, y) in world coordinates

        Returns:
            List of waypoints (x, y) or None if no path found
        """
        # Convert to grid coordinates
        start_col, start_row = self._world_to_grid(start[0], start[1])
        end_col, end_row = self._world_to_grid(end[0], end[1])

        # Check if start/end are valid
        if self.exclusion_mask[start_row, start_col]:
            return None
        if self.exclusion_mask[end_row, end_col]:
            return None

        # Initialize start and goal nodes
        start_node = PathNode(start_col, start_row, g_cost=0)
        goal_node = PathNode(end_col, end_row)
        start_node.h_cost = self._heuristic(start_node, goal_node)

        # Priority queue (min-heap)
        open_set: List[PathNode] = [start_node]
        heapq.heapify(open_set)

        # Visited nodes
        closed_set: Set[Tuple[int, int]] = set()

        # Node lookup for updating costs
        node_map: Dict[Tuple[int, int], PathNode] = {(start_col, start_row): start_node}

        while open_set:
            current = heapq.heappop(open_set)

            # Check if we reached the goal
            if current.x == goal_node.x and current.y == goal_node.y:
                return self._reconstruct_path(current)

            closed_set.add((current.x, current.y))

            # Explore neighbors
            for neighbor, cost in self._get_neighbors(current):
                if (neighbor.x, neighbor.y) in closed_set:
                    continue

                tentative_g = current.g_cost + cost

                existing = node_map.get((neighbor.x, neighbor.y))

                if existing is None:
                    neighbor.g_cost = tentative_g
                    neighbor.h_cost = self._heuristic(neighbor, goal_node)
                    neighbor.parent = current
                    node_map[(neighbor.x, neighbor.y)] = neighbor
                    heapq.heappush(open_set, neighbor)
                elif tentative_g < existing.g_cost:
                    existing.g_cost = tentative_g
                    existing.parent = current
                    heapq.heapify(open_set)

        return None  # No path found

    def _reconstruct_path(self, end_node: PathNode) -> List[Tuple[float, float]]:
        """Reconstruct path from end node to start."""
        path = []
        current: Optional[PathNode] = end_node

        while current is not None:
            world_coords = self._grid_to_world(current.x, current.y)
            path.append(world_coords)
            current = current.parent

        path.reverse()

        # Smooth path if configured
        if self.config.smooth_path:
            path = self._smooth_path(path)

        return path

    def _smooth_path(self, path: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Smooth path using iterative averaging."""
        if len(path) < 3:
            return path

        smoothed = list(path)

        for _ in range(self.config.smooth_iterations):
            new_path = [smoothed[0]]  # Keep start fixed

            for i in range(1, len(smoothed) - 1):
                prev = smoothed[i - 1]
                curr = smoothed[i]
                next_pt = smoothed[i + 1]

                # Average with neighbors
                new_x = (prev[0] + curr[0] * 2 + next_pt[0]) / 4
                new_y = (prev[1] + curr[1] * 2 + next_pt[1]) / 4

                # Check if smoothed point is valid
                col, row = self._world_to_grid(new_x, new_y)
                if not self.exclusion_mask[row, col]:
                    new_path.append((new_x, new_y))
                else:
                    new_path.append(curr)

            new_path.append(smoothed[-1])  # Keep end fixed
            smoothed = new_path

        return smoothed

    def calculate_road_segments(
        self,
        waypoints: List[Tuple[float, float]],
    ) -> List[RoadSegment]:
        """Calculate road segments with gradients from waypoints."""
        segments = []

        for i in range(len(waypoints) - 1):
            start = waypoints[i]
            end = waypoints[i + 1]

            dx = end[0] - start[0]
            dy = end[1] - start[1]

            length = np.sqrt(dx * dx + dy * dy)
            direction = np.degrees(np.arctan2(dy, dx))

            # Calculate gradient from elevation data
            gradient = 0.0
            if self.elevation_data is not None:
                start_elev = self._get_elevation(start[0], start[1])
                end_elev = self._get_elevation(end[0], end[1])
                if start_elev is not None and end_elev is not None:
                    elev_change = end_elev - start_elev
                    gradient = (elev_change / length) * 100 if length > 0 else 0.0

            segments.append(RoadSegment(
                start=start,
                end=end,
                length=length,
                gradient=gradient,
                direction=direction,
            ))

        return segments

    def _get_elevation(self, x: float, y: float) -> Optional[float]:
        """Get elevation at a point."""
        if self.elevation_data is None:
            return None

        rows, cols = self.elevation_data.shape
        col = int((x - self.min_x) / self.width * cols)
        row = int((self.max_y - y) / self.height * rows)

        col = max(0, min(col, cols - 1))
        row = max(0, min(row, rows - 1))

        return float(self.elevation_data[row, col])


def generate_road_network(
    boundary: Dict[str, Any],
    entry_point: Tuple[float, float],
    destinations: List[Tuple[float, float]],
    exclusion_zones: Optional[List[Dict[str, Any]]] = None,
    elevation_data: Optional[np.ndarray] = None,
    slope_data: Optional[np.ndarray] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generate a road network connecting entry point to destinations.

    Args:
        boundary: GeoJSON polygon of site boundary
        entry_point: Entry point coordinates (x, y)
        destinations: List of destination coordinates
        exclusion_zones: List of GeoJSON polygons to avoid
        elevation_data: DEM data for gradient calculations
        slope_data: Pre-computed slope data
        config: Pathfinding configuration

    Returns:
        Road network as dictionary
    """
    from shapely.geometry import shape
    import uuid

    # Convert boundary
    boundary_poly = shape(boundary)

    # Convert exclusion zones
    exclusions = []
    if exclusion_zones:
        for zone in exclusion_zones:
            exclusions.append(shape(zone))

    # Create config
    pathfinding_config = PathfindingConfig()
    if config:
        for key, value in config.items():
            if hasattr(pathfinding_config, key):
                setattr(pathfinding_config, key, value)

    # Create pathfinder
    pathfinder = TerrainAwarePathfinder(
        boundary=boundary_poly,
        elevation_data=elevation_data,
        slope_data=slope_data,
        exclusion_zones=exclusions,
        config=pathfinding_config,
    )

    # Generate paths to each destination
    paths = []
    total_length = 0.0

    for i, destination in enumerate(destinations):
        waypoints = pathfinder.find_path(entry_point, destination)

        if waypoints:
            segments = pathfinder.calculate_road_segments(waypoints)

            path_length = sum(s.length for s in segments)
            gradients = [abs(s.gradient) for s in segments]
            max_gradient = max(gradients) if gradients else 0.0
            avg_gradient = sum(gradients) / len(gradients) if gradients else 0.0

            path = RoadPath(
                path_id=f"road-{i}",
                start_point=entry_point,
                end_point=destination,
                waypoints=waypoints,
                segments=segments,
                total_length=path_length,
                max_gradient=max_gradient,
                avg_gradient=avg_gradient,
                geometry=LineString(waypoints),
            )
            paths.append(path)
            total_length += path_length

    # Calculate coverage area (buffer around roads)
    if paths:
        road_geometries = [p.geometry.buffer(pathfinding_config.road_width / 2) for p in paths]
        coverage = unary_union(road_geometries)
        coverage_area = coverage.area
    else:
        coverage_area = 0.0

    network = RoadNetwork(
        network_id=str(uuid.uuid4()),
        entry_point=entry_point,
        paths=paths,
        total_length=total_length,
        coverage_area=coverage_area,
    )

    return network.to_dict()
