"""
Report Models

Data models for PDF report generation.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
import base64


class ReportSection(Enum):
    """Available report sections."""

    COVER = "cover"
    EXECUTIVE_SUMMARY = "executive_summary"
    SITE_OVERVIEW = "site_overview"
    TERRAIN_ANALYSIS = "terrain_analysis"
    LAYOUT_PLAN = "layout_plan"
    ASSET_SCHEDULE = "asset_schedule"
    EARTHWORK_SUMMARY = "earthwork_summary"
    COST_ESTIMATE = "cost_estimate"
    ROAD_NETWORK = "road_network"
    APPENDIX = "appendix"


class MapType(Enum):
    """Types of maps that can be included."""

    SITE_BOUNDARY = "site_boundary"
    SLOPE_ANALYSIS = "slope_analysis"
    ASPECT_ANALYSIS = "aspect_analysis"
    LAYOUT_PLAN = "layout_plan"
    EXCLUSION_ZONES = "exclusion_zones"
    ROAD_NETWORK = "road_network"


@dataclass
class ProjectInfo:
    """Project information for report header."""

    project_id: str
    project_name: str
    client_name: Optional[str] = None
    location: Optional[str] = None
    coordinates: Optional[Tuple[float, float]] = None
    total_area_m2: float = 0.0
    report_date: str = field(default_factory=lambda: datetime.now().isoformat())
    prepared_by: Optional[str] = None
    revision: str = "1.0"


@dataclass
class MapImage:
    """Map image for inclusion in report."""

    map_type: MapType
    title: str
    image_data: bytes  # PNG or JPEG bytes
    width_inches: float = 6.5
    height_inches: float = 4.5
    caption: Optional[str] = None
    scale: Optional[str] = None
    north_arrow: bool = True

    def to_base64(self) -> str:
        """Convert image data to base64."""
        return base64.b64encode(self.image_data).decode("utf-8")


@dataclass
class TerrainSummary:
    """Terrain analysis summary."""

    min_elevation: float
    max_elevation: float
    mean_elevation: float
    elevation_range: float
    min_slope: float
    max_slope: float
    mean_slope: float
    dominant_aspect: str
    buildable_area_percent: float
    slope_class_distribution: Dict[str, float]


@dataclass
class AssetInfo:
    """Asset information for schedule."""

    asset_id: str
    asset_type: str
    name: str
    dimensions: Tuple[float, float, float]  # width, length, height
    area_m2: float
    position: Tuple[float, float]
    rotation: float
    cut_volume: float
    fill_volume: float
    net_earthwork: float
    is_valid: bool
    violations: List[str] = field(default_factory=list)


@dataclass
class RoadInfo:
    """Road segment information."""

    segment_id: str
    length_m: float
    width_m: float
    start_elevation: float
    end_elevation: float
    gradient_percent: float
    cut_volume: float
    fill_volume: float


@dataclass
class EarthworkSummary:
    """Earthwork summary for report."""

    total_cut_volume: float
    total_fill_volume: float
    net_volume: float
    adjusted_cut: float
    adjusted_fill: float
    import_required: float
    export_required: float
    balance_on_site: float
    shrink_factor: float
    swell_factor: float


@dataclass
class CostBreakdown:
    """Cost estimate breakdown."""

    cut_cost: float
    fill_cost: float
    haul_cost: float
    import_cost: float
    export_cost: float
    total_earthwork_cost: float
    road_cost: Optional[float] = None
    contingency_percent: float = 10.0
    contingency_amount: float = 0.0
    total_cost: float = 0.0

    def calculate_totals(self):
        """Calculate contingency and total."""
        self.contingency_amount = self.total_earthwork_cost * (
            self.contingency_percent / 100
        )
        self.total_cost = self.total_earthwork_cost + self.contingency_amount
        if self.road_cost:
            self.total_cost += self.road_cost


@dataclass
class ReportConfig:
    """Configuration for report generation."""

    sections: List[ReportSection] = field(
        default_factory=lambda: [
            ReportSection.COVER,
            ReportSection.EXECUTIVE_SUMMARY,
            ReportSection.SITE_OVERVIEW,
            ReportSection.TERRAIN_ANALYSIS,
            ReportSection.LAYOUT_PLAN,
            ReportSection.ASSET_SCHEDULE,
            ReportSection.EARTHWORK_SUMMARY,
            ReportSection.COST_ESTIMATE,
        ]
    )
    include_maps: List[MapType] = field(
        default_factory=lambda: [
            MapType.SITE_BOUNDARY,
            MapType.SLOPE_ANALYSIS,
            MapType.LAYOUT_PLAN,
        ]
    )
    page_size: str = "letter"  # letter, a4
    orientation: str = "portrait"
    include_page_numbers: bool = True
    include_toc: bool = True
    company_logo: Optional[bytes] = None
    company_name: str = "Site Layouts"
    footer_text: Optional[str] = None


@dataclass
class ReportData:
    """Complete data for report generation."""

    project: ProjectInfo
    config: ReportConfig
    terrain: Optional[TerrainSummary] = None
    assets: List[AssetInfo] = field(default_factory=list)
    roads: List[RoadInfo] = field(default_factory=list)
    earthwork: Optional[EarthworkSummary] = None
    costs: Optional[CostBreakdown] = None
    maps: List[MapImage] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    exclusion_zone_count: int = 0
    total_road_length: float = 0.0


@dataclass
class ReportResult:
    """Result of report generation."""

    success: bool
    filename: str
    file_size: int
    page_count: int
    generation_time_ms: float
    pdf_data: Optional[bytes] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (without PDF data)."""
        return {
            "success": self.success,
            "filename": self.filename,
            "file_size": self.file_size,
            "page_count": self.page_count,
            "generation_time_ms": round(self.generation_time_ms, 2),
            "error": self.error,
        }
