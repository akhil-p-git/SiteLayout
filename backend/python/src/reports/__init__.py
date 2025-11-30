"""
Reports Module

PDF report generation for site layouts.
"""

from .models import (
    ReportSection,
    MapType,
    ProjectInfo,
    MapImage,
    TerrainSummary,
    AssetInfo,
    RoadInfo,
    EarthworkSummary,
    CostBreakdown,
    ReportConfig,
    ReportData,
    ReportResult,
)

from .generator import (
    PDFReportGenerator,
    generate_report,
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
