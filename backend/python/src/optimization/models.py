"""
Asset Placement Optimization Models

Defines data models for asset types, placement constraints,
and optimization objectives.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
import numpy as np
from shapely.geometry import Polygon, Point, MultiPolygon
from shapely.ops import unary_union


class AssetType(Enum):
    """Types of assets that can be placed on a solar site."""
    BESS = "bess"  # Battery Energy Storage System
    SUBSTATION = "substation"
    O_AND_M = "o_and_m"  # Operations & Maintenance building
    PARKING = "parking"
    LAYDOWN = "laydown"  # Construction laydown area
    INVERTER_PAD = "inverter_pad"
    TRANSFORMER_PAD = "transformer_pad"
    WEATHER_STATION = "weather_station"
    FENCE = "fence"
    ACCESS_ROAD = "access_road"


class OptimizationObjective(Enum):
    """Optimization objectives for layout generation."""
    MIN_EARTHWORK = "min_earthwork"  # Minimize grading/earthwork
    MAX_CAPACITY = "max_capacity"  # Maximize equipment capacity
    BALANCED = "balanced"  # Balance multiple objectives
    MIN_CABLE_LENGTH = "min_cable_length"  # Minimize electrical cable runs
    MIN_ROAD_LENGTH = "min_road_length"  # Minimize access road length
    CUSTOM = "custom"


@dataclass
class AssetDimensions:
    """Physical dimensions of an asset."""
    width: float  # meters
    length: float  # meters
    height: float = 0.0  # meters (for clearance calculations)
    rotation_allowed: bool = True
    rotation_step: float = 90.0  # degrees (allowed rotation increments)


@dataclass
class AssetConstraints:
    """Placement constraints for an asset."""
    min_setback: float = 10.0  # meters from boundary
    max_slope: float = 5.0  # degrees
    requires_road_access: bool = True
    max_road_distance: float = 50.0  # meters
    min_distance_to_same: float = 0.0  # meters to same asset type
    min_distance_to_other: Dict[AssetType, float] = field(default_factory=dict)
    preferred_elevation: Optional[str] = None  # "high", "low", "flat"
    avoid_exclusion_zones: bool = True


@dataclass
class AssetDefinition:
    """Complete definition of an asset for optimization."""
    asset_type: AssetType
    name: str
    dimensions: AssetDimensions
    constraints: AssetConstraints
    quantity: int = 1  # Number to place
    priority: int = 1  # Higher = placed first
    required: bool = True  # Must be placed
    cost_weight: float = 1.0  # Relative cost multiplier


# Default asset definitions for solar sites
DEFAULT_ASSET_DEFINITIONS: Dict[AssetType, AssetDefinition] = {
    AssetType.BESS: AssetDefinition(
        asset_type=AssetType.BESS,
        name="Battery Energy Storage System",
        dimensions=AssetDimensions(width=50, length=80, height=3),
        constraints=AssetConstraints(
            min_setback=30,
            max_slope=2,
            requires_road_access=True,
            max_road_distance=30,
        ),
        quantity=1,
        priority=10,
    ),
    AssetType.SUBSTATION: AssetDefinition(
        asset_type=AssetType.SUBSTATION,
        name="Electrical Substation",
        dimensions=AssetDimensions(width=40, length=60, height=8),
        constraints=AssetConstraints(
            min_setback=50,
            max_slope=1,
            requires_road_access=True,
            max_road_distance=20,
        ),
        quantity=1,
        priority=9,
    ),
    AssetType.O_AND_M: AssetDefinition(
        asset_type=AssetType.O_AND_M,
        name="O&M Building",
        dimensions=AssetDimensions(width=20, length=30, height=5),
        constraints=AssetConstraints(
            min_setback=20,
            max_slope=3,
            requires_road_access=True,
            max_road_distance=10,
        ),
        quantity=1,
        priority=7,
    ),
    AssetType.PARKING: AssetDefinition(
        asset_type=AssetType.PARKING,
        name="Parking Area",
        dimensions=AssetDimensions(width=30, length=50, height=0),
        constraints=AssetConstraints(
            min_setback=10,
            max_slope=5,
            requires_road_access=True,
            max_road_distance=5,
        ),
        quantity=1,
        priority=5,
    ),
    AssetType.LAYDOWN: AssetDefinition(
        asset_type=AssetType.LAYDOWN,
        name="Construction Laydown",
        dimensions=AssetDimensions(width=60, length=100, height=0),
        constraints=AssetConstraints(
            min_setback=15,
            max_slope=3,
            requires_road_access=True,
            max_road_distance=20,
        ),
        quantity=1,
        priority=4,
        required=False,
    ),
    AssetType.INVERTER_PAD: AssetDefinition(
        asset_type=AssetType.INVERTER_PAD,
        name="Inverter Pad",
        dimensions=AssetDimensions(width=5, length=8, height=2),
        constraints=AssetConstraints(
            min_setback=10,
            max_slope=3,
            requires_road_access=False,
            max_road_distance=100,
        ),
        quantity=10,
        priority=6,
    ),
    AssetType.WEATHER_STATION: AssetDefinition(
        asset_type=AssetType.WEATHER_STATION,
        name="Weather Station",
        dimensions=AssetDimensions(width=3, length=3, height=10, rotation_allowed=False),
        constraints=AssetConstraints(
            min_setback=20,
            max_slope=10,
            requires_road_access=False,
            max_road_distance=200,
            min_distance_to_same=500,  # Weather stations should be spread out
        ),
        quantity=2,
        priority=3,
        required=False,
    ),
}


@dataclass
class PlacedAsset:
    """An asset that has been placed in the layout."""
    asset_id: str
    asset_type: AssetType
    definition: AssetDefinition
    position: Tuple[float, float]  # (x, y) in site coordinates
    rotation: float = 0.0  # degrees
    footprint: Optional[Polygon] = None

    def __post_init__(self):
        """Calculate footprint polygon."""
        if self.footprint is None:
            self.footprint = self._calculate_footprint()

    def _calculate_footprint(self) -> Polygon:
        """Calculate the footprint polygon based on position and rotation."""
        w = self.definition.dimensions.width / 2
        l = self.definition.dimensions.length / 2

        # Create rectangle centered at origin
        corners = [(-w, -l), (w, -l), (w, l), (-w, l)]

        # Rotate if needed
        if self.rotation != 0:
            angle_rad = np.radians(self.rotation)
            cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
            corners = [
                (x * cos_a - y * sin_a, x * sin_a + y * cos_a)
                for x, y in corners
            ]

        # Translate to position
        corners = [(x + self.position[0], y + self.position[1]) for x, y in corners]

        return Polygon(corners)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "asset_id": self.asset_id,
            "asset_type": self.asset_type.value,
            "name": self.definition.name,
            "position": {
                "x": self.position[0],
                "y": self.position[1],
            },
            "rotation": self.rotation,
            "dimensions": {
                "width": self.definition.dimensions.width,
                "length": self.definition.dimensions.length,
                "height": self.definition.dimensions.height,
            },
            "footprint": {
                "type": "Polygon",
                "coordinates": [list(self.footprint.exterior.coords)],
            } if self.footprint else None,
        }


@dataclass
class OptimizationConfig:
    """Configuration for the optimization algorithm."""
    objective: OptimizationObjective = OptimizationObjective.BALANCED
    objective_weights: Dict[str, float] = field(default_factory=lambda: {
        "earthwork": 0.4,
        "cable_length": 0.3,
        "road_length": 0.2,
        "compactness": 0.1,
    })
    population_size: int = 100
    generations: int = 200
    mutation_rate: float = 0.1
    crossover_rate: float = 0.8
    elite_size: int = 10
    convergence_threshold: float = 0.001
    max_stagnation: int = 30  # Generations without improvement
    random_seed: Optional[int] = None
    parallel_workers: int = 4
    generate_alternatives: int = 3  # Number of alternative layouts


@dataclass
class SiteContext:
    """Context information about the site for optimization."""
    boundary: Polygon
    exclusion_zones: List[Polygon] = field(default_factory=list)
    slope_data: Optional[np.ndarray] = None  # 2D array of slope values
    elevation_data: Optional[np.ndarray] = None  # DEM data
    existing_roads: List[Polygon] = field(default_factory=list)
    entry_points: List[Point] = field(default_factory=list)
    grid_resolution: float = 1.0  # meters per pixel
    crs: str = "EPSG:4326"

    @property
    def buildable_area(self) -> Polygon:
        """Calculate buildable area (boundary minus exclusions)."""
        if not self.exclusion_zones:
            return self.boundary

        exclusion_union = unary_union(self.exclusion_zones)
        return self.boundary.difference(exclusion_union)

    @property
    def area_sqm(self) -> float:
        """Total site area in square meters."""
        return self.boundary.area

    @property
    def buildable_area_sqm(self) -> float:
        """Buildable area in square meters."""
        return self.buildable_area.area


@dataclass
class LayoutSolution:
    """A complete layout solution from the optimizer."""
    solution_id: str
    placed_assets: List[PlacedAsset]
    fitness_score: float
    objective_scores: Dict[str, float]
    constraint_violations: List[str]
    is_valid: bool
    generation: int
    computation_time_ms: float

    @property
    def total_asset_area(self) -> float:
        """Total area occupied by placed assets."""
        footprints = [a.footprint for a in self.placed_assets if a.footprint]
        if not footprints:
            return 0.0
        return unary_union(footprints).area

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "solution_id": self.solution_id,
            "placed_assets": [a.to_dict() for a in self.placed_assets],
            "fitness_score": self.fitness_score,
            "objective_scores": self.objective_scores,
            "constraint_violations": self.constraint_violations,
            "is_valid": self.is_valid,
            "generation": self.generation,
            "computation_time_ms": self.computation_time_ms,
            "statistics": {
                "total_assets": len(self.placed_assets),
                "total_asset_area": self.total_asset_area,
            },
        }


@dataclass
class OptimizationResult:
    """Result of running the optimization."""
    best_solution: LayoutSolution
    alternative_solutions: List[LayoutSolution]
    convergence_history: List[float]
    total_generations: int
    total_time_ms: float
    config: OptimizationConfig

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "best_solution": self.best_solution.to_dict(),
            "alternative_solutions": [s.to_dict() for s in self.alternative_solutions],
            "convergence_history": self.convergence_history,
            "total_generations": self.total_generations,
            "total_time_ms": self.total_time_ms,
            "config": {
                "objective": self.config.objective.value,
                "population_size": self.config.population_size,
                "generations": self.config.generations,
            },
        }
