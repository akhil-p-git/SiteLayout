"""
Earthwork Models

Data models for cut/fill volume estimation and cost calculation.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class SoilType(Enum):
    """Soil classification types."""

    ROCK = "rock"
    GRAVEL = "gravel"
    SAND = "sand"
    CLAY = "clay"
    TOPSOIL = "topsoil"
    MIXED = "mixed"


class GradingMethod(Enum):
    """Grading method for pad preparation."""

    LEVEL = "level"  # Level pad at single elevation
    SLOPED = "sloped"  # Pad follows terrain with max slope
    TERRACED = "terraced"  # Multiple level terraces


@dataclass
class SoilProperties:
    """Properties of soil affecting earthwork calculations."""

    soil_type: SoilType
    shrink_factor: float = 1.0  # Factor applied to cut volumes (< 1 = compaction)
    swell_factor: float = 1.2  # Factor applied to fill volumes (> 1 = expansion)
    max_slope_ratio: float = 2.0  # Maximum cut/fill slope ratio (H:V)
    unit_weight: float = 1800.0  # kg/m³

    @classmethod
    def get_default(cls, soil_type: SoilType) -> "SoilProperties":
        """Get default properties for soil type."""
        defaults = {
            SoilType.ROCK: cls(SoilType.ROCK, 0.85, 1.5, 0.25, 2500),
            SoilType.GRAVEL: cls(SoilType.GRAVEL, 0.95, 1.15, 1.5, 2000),
            SoilType.SAND: cls(SoilType.SAND, 0.95, 1.1, 2.0, 1700),
            SoilType.CLAY: cls(SoilType.CLAY, 0.9, 1.3, 3.0, 1600),
            SoilType.TOPSOIL: cls(SoilType.TOPSOIL, 0.85, 1.25, 3.0, 1400),
            SoilType.MIXED: cls(SoilType.MIXED, 0.9, 1.2, 2.0, 1800),
        }
        return defaults.get(soil_type, defaults[SoilType.MIXED])


@dataclass
class CostFactors:
    """Cost factors for earthwork estimation."""

    cut_cost_per_m3: float = 5.0  # $/m³ for excavation
    fill_cost_per_m3: float = 8.0  # $/m³ for fill placement and compaction
    haul_cost_per_m3_km: float = 2.0  # $/m³/km for hauling
    import_cost_per_m3: float = 15.0  # $/m³ for importing fill material
    export_cost_per_m3: float = 10.0  # $/m³ for exporting excess material
    rock_multiplier: float = 3.0  # Multiplier for rock excavation

    def calculate_cut_cost(self, volume: float, is_rock: bool = False) -> float:
        """Calculate total cut cost."""
        base_cost = volume * self.cut_cost_per_m3
        if is_rock:
            base_cost *= self.rock_multiplier
        return base_cost

    def calculate_fill_cost(self, volume: float) -> float:
        """Calculate total fill cost."""
        return volume * self.fill_cost_per_m3

    def calculate_haul_cost(self, volume: float, distance_km: float) -> float:
        """Calculate haul cost."""
        return volume * distance_km * self.haul_cost_per_m3_km


@dataclass
class PadDesign:
    """Design parameters for an asset pad."""

    asset_id: str
    asset_type: str
    position: tuple[float, float]  # Center position (x, y)
    dimensions: tuple[float, float]  # Width, length in meters
    rotation: float = 0.0  # Rotation in degrees
    target_elevation: float | None = None  # Target pad elevation (auto if None)
    grading_method: GradingMethod = GradingMethod.LEVEL
    max_pad_slope: float = 2.0  # Max slope % for sloped pads
    buffer_distance: float = 2.0  # Additional grading around pad


@dataclass
class RoadDesign:
    """Design parameters for a road segment."""

    segment_id: str
    start_point: tuple[float, float]
    end_point: tuple[float, float]
    width: float = 6.0  # Road width in meters
    target_grade: float | None = None  # Target grade % (None = follow terrain)
    max_grade: float = 10.0  # Maximum grade %
    shoulder_width: float = 1.0  # Shoulder width each side
    cross_slope: float = 2.0  # Cross slope % for drainage


@dataclass
class VolumeResult:
    """Result of volume calculation for a single element."""

    element_id: str
    element_type: str  # "pad" or "road"
    cut_volume: float  # m³
    fill_volume: float  # m³
    net_volume: float  # cut - fill (positive = excess cut)
    adjusted_cut: float  # After shrink factor
    adjusted_fill: float  # After swell factor
    adjusted_net: float  # Adjusted net volume
    area: float  # m²
    average_cut_depth: float  # m
    average_fill_depth: float  # m
    max_cut_depth: float  # m
    max_fill_depth: float  # m
    existing_elevation_range: tuple[float, float]  # min, max
    design_elevation: float  # Target elevation

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "element_id": self.element_id,
            "element_type": self.element_type,
            "cut_volume_m3": round(self.cut_volume, 2),
            "fill_volume_m3": round(self.fill_volume, 2),
            "net_volume_m3": round(self.net_volume, 2),
            "adjusted_cut_m3": round(self.adjusted_cut, 2),
            "adjusted_fill_m3": round(self.adjusted_fill, 2),
            "adjusted_net_m3": round(self.adjusted_net, 2),
            "area_m2": round(self.area, 2),
            "average_cut_depth_m": round(self.average_cut_depth, 3),
            "average_fill_depth_m": round(self.average_fill_depth, 3),
            "max_cut_depth_m": round(self.max_cut_depth, 3),
            "max_fill_depth_m": round(self.max_fill_depth, 3),
            "existing_elevation_min_m": round(self.existing_elevation_range[0], 2),
            "existing_elevation_max_m": round(self.existing_elevation_range[1], 2),
            "design_elevation_m": round(self.design_elevation, 2),
        }


@dataclass
class CostResult:
    """Cost estimation result."""

    cut_cost: float
    fill_cost: float
    haul_cost: float
    import_cost: float
    export_cost: float
    total_cost: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "cut_cost": round(self.cut_cost, 2),
            "fill_cost": round(self.fill_cost, 2),
            "haul_cost": round(self.haul_cost, 2),
            "import_cost": round(self.import_cost, 2),
            "export_cost": round(self.export_cost, 2),
            "total_cost": round(self.total_cost, 2),
        }


@dataclass
class HaulRoute:
    """Haul route between cut and fill areas."""

    source_id: str
    destination_id: str
    distance_m: float
    volume_m3: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "source_id": self.source_id,
            "destination_id": self.destination_id,
            "distance_m": round(self.distance_m, 1),
            "volume_m3": round(self.volume_m3, 2),
        }


@dataclass
class EarthworkSummary:
    """Summary of all earthwork calculations."""

    project_id: str
    total_cut_volume: float
    total_fill_volume: float
    total_net_volume: float
    adjusted_total_cut: float
    adjusted_total_fill: float
    adjusted_net: float
    import_required: float  # Fill needed from outside
    export_required: float  # Cut to be removed from site
    balance_on_site: float  # Material balanced on site
    pad_results: list[VolumeResult] = field(default_factory=list)
    road_results: list[VolumeResult] = field(default_factory=list)
    haul_routes: list[HaulRoute] = field(default_factory=list)
    cost_estimate: CostResult | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "project_id": self.project_id,
            "summary": {
                "total_cut_volume_m3": round(self.total_cut_volume, 2),
                "total_fill_volume_m3": round(self.total_fill_volume, 2),
                "total_net_volume_m3": round(self.total_net_volume, 2),
                "adjusted_total_cut_m3": round(self.adjusted_total_cut, 2),
                "adjusted_total_fill_m3": round(self.adjusted_total_fill, 2),
                "adjusted_net_m3": round(self.adjusted_net, 2),
                "import_required_m3": round(self.import_required, 2),
                "export_required_m3": round(self.export_required, 2),
                "balance_on_site_m3": round(self.balance_on_site, 2),
            },
            "pad_volumes": [r.to_dict() for r in self.pad_results],
            "road_volumes": [r.to_dict() for r in self.road_results],
            "haul_routes": [r.to_dict() for r in self.haul_routes],
            "cost_estimate": (
                self.cost_estimate.to_dict() if self.cost_estimate else None
            ),
        }


# Default configurations
DEFAULT_SOIL_PROPERTIES = SoilProperties.get_default(SoilType.MIXED)

DEFAULT_COST_FACTORS = CostFactors(
    cut_cost_per_m3=5.0,
    fill_cost_per_m3=8.0,
    haul_cost_per_m3_km=2.0,
    import_cost_per_m3=15.0,
    export_cost_per_m3=10.0,
    rock_multiplier=3.0,
)
