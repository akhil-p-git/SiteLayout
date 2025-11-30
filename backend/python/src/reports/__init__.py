"""
Reports Module

PDF report generation for site layouts.
"""

from .generator import (
    PDFReportGenerator,
    generate_report,
)
from .models import (
    AssetInfo,
    CostBreakdown,
    EarthworkSummary,
    MapImage,
    MapType,
    ProjectInfo,
    ReportConfig,
    ReportData,
    ReportResult,
    ReportSection,
    RoadInfo,
    TerrainSummary,
)

__all__ = [
    # Models
    "ReportSection",
    "MapType",
    "ProjectInfo",
    "MapImage",
    "TerrainSummary",
    "AssetInfo",
    "RoadInfo",
    "EarthworkSummary",
    "CostBreakdown",
    "ReportConfig",
    "ReportData",
    "ReportResult",
    # Generator
    "PDFReportGenerator",
    "generate_report",
]
