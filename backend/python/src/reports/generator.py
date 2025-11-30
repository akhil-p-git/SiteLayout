"""
PDF Report Generator

Generates professional PDF reports using ReportLab.
"""

import io
import time
from datetime import datetime
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
    KeepTogether,
)
from reportlab.platypus.tableofcontents import TableOfContents

from .models import (
    ReportData,
    ReportResult,
    ReportSection,
    MapType,
    ReportConfig,
)


class PDFReportGenerator:
    """
    PDF report generator using ReportLab.
    """

    def __init__(self, data: ReportData):
        self.data = data
        self.config = data.config
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.story = []
        self.page_count = 0

    def _setup_custom_styles(self):
        """Set up custom paragraph styles."""
        # Title style
        self.styles.add(
            ParagraphStyle(
                name="ReportTitle",
                parent=self.styles["Heading1"],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.HexColor("#1e3a5f"),
                alignment=1,  # Center
            )
        )

        # Subtitle style
        self.styles.add(
            ParagraphStyle(
                name="ReportSubtitle",
                parent=self.styles["Normal"],
                fontSize=14,
                spaceAfter=12,
                textColor=colors.HexColor("#666666"),
                alignment=1,
            )
        )

        # Section header
        self.styles.add(
            ParagraphStyle(
                name="SectionHeader",
                parent=self.styles["Heading2"],
                fontSize=16,
                spaceBefore=20,
                spaceAfter=12,
                textColor=colors.HexColor("#1e3a5f"),
                borderPadding=(0, 0, 5, 0),
            )
        )

        # Subsection header
        self.styles.add(
            ParagraphStyle(
                name="SubsectionHeader",
                parent=self.styles["Heading3"],
                fontSize=12,
                spaceBefore=12,
                spaceAfter=8,
                textColor=colors.HexColor("#333333"),
            )
        )

        # Body text
        self.styles.add(
            ParagraphStyle(
                name="BodyText",
                parent=self.styles["Normal"],
                fontSize=10,
                spaceAfter=8,
                leading=14,
            )
        )

        # Table header
        self.styles.add(
            ParagraphStyle(
                name="TableHeader",
                parent=self.styles["Normal"],
                fontSize=9,
                textColor=colors.white,
                alignment=1,
            )
        )

        # Table cell
        self.styles.add(
            ParagraphStyle(
                name="TableCell",
                parent=self.styles["Normal"],
                fontSize=9,
                alignment=1,
            )
        )

    def _get_page_size(self):
        """Get page size based on config."""
        if self.config.page_size.lower() == "a4":
            return A4
        return letter

    def _add_cover_page(self):
        """Add cover page."""
        self.story.append(Spacer(1, 2 * inch))

        # Title
        self.story.append(
            Paragraph(self.data.project.project_name, self.styles["ReportTitle"])
        )

        self.story.append(
            Paragraph("Site Layout Report", self.styles["ReportSubtitle"])
        )

        self.story.append(Spacer(1, 0.5 * inch))

        # Project info table
        info_data = [
            ["Client:", self.data.project.client_name or "N/A"],
            ["Location:", self.data.project.location or "N/A"],
            [
                "Total Area:",
                f"{self.data.project.total_area_m2:,.0f} m² ({self.data.project.total_area_m2/10000:.2f} ha)",
            ],
            [
                "Report Date:",
                datetime.fromisoformat(self.data.project.report_date).strftime(
                    "%B %d, %Y"
                ),
            ],
            ["Revision:", self.data.project.revision],
        ]

        if self.data.project.prepared_by:
            info_data.append(["Prepared By:", self.data.project.prepared_by])

        info_table = Table(info_data, colWidths=[1.5 * inch, 3.5 * inch])
        info_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                    ("ALIGN", (1, 0), (1, -1), "LEFT"),
                ]
            )
        )

        self.story.append(info_table)
        self.story.append(PageBreak())

    def _add_executive_summary(self):
        """Add executive summary section."""
        self.story.append(Paragraph("Executive Summary", self.styles["SectionHeader"]))

        # Key metrics
        summary_text = f"""
        This report presents the site layout analysis for {self.data.project.project_name}.
        The total site area is {self.data.project.total_area_m2:,.0f} m²
        ({self.data.project.total_area_m2/10000:.2f} hectares).
        """

        if self.data.terrain:
            summary_text += f"""
            <br/><br/>
            <b>Terrain Analysis:</b> The site elevation ranges from {self.data.terrain.min_elevation:.1f}m
            to {self.data.terrain.max_elevation:.1f}m with an average slope of {self.data.terrain.mean_slope:.1f}°.
            Approximately {self.data.terrain.buildable_area_percent:.1f}% of the site is suitable for development.
            """

        if self.data.assets:
            summary_text += f"""
            <br/><br/>
            <b>Layout Summary:</b> The proposed layout includes {len(self.data.assets)} assets
            with a total footprint of {sum(a.area_m2 for a in self.data.assets):,.0f} m².
            """

        if self.data.earthwork:
            summary_text += f"""
            <br/><br/>
            <b>Earthwork:</b> Total cut volume is {self.data.earthwork.total_cut_volume:,.0f} m³
            and fill volume is {self.data.earthwork.total_fill_volume:,.0f} m³,
            resulting in a net {'export' if self.data.earthwork.net_volume > 0 else 'import'}
            of {abs(self.data.earthwork.net_volume):,.0f} m³.
            """

        if self.data.costs:
            summary_text += f"""
            <br/><br/>
            <b>Cost Estimate:</b> The total estimated earthwork cost is
            ${self.data.costs.total_cost:,.0f} (including {self.data.costs.contingency_percent:.0f}% contingency).
            """

        self.story.append(Paragraph(summary_text, self.styles["BodyText"]))
        self.story.append(Spacer(1, 0.25 * inch))

    def _add_terrain_analysis(self):
        """Add terrain analysis section."""
        if not self.data.terrain:
            return

        self.story.append(Paragraph("Terrain Analysis", self.styles["SectionHeader"]))

        # Elevation summary
        self.story.append(
            Paragraph("Elevation Summary", self.styles["SubsectionHeader"])
        )

        elev_data = [
            ["Parameter", "Value"],
            ["Minimum Elevation", f"{self.data.terrain.min_elevation:.2f} m"],
            ["Maximum Elevation", f"{self.data.terrain.max_elevation:.2f} m"],
            ["Mean Elevation", f"{self.data.terrain.mean_elevation:.2f} m"],
            ["Elevation Range", f"{self.data.terrain.elevation_range:.2f} m"],
        ]

        elev_table = self._create_table(elev_data, [2.5 * inch, 2 * inch])
        self.story.append(elev_table)
        self.story.append(Spacer(1, 0.25 * inch))

        # Slope summary
        self.story.append(Paragraph("Slope Analysis", self.styles["SubsectionHeader"]))

        slope_data = [
            ["Parameter", "Value"],
            ["Minimum Slope", f"{self.data.terrain.min_slope:.1f}°"],
            ["Maximum Slope", f"{self.data.terrain.max_slope:.1f}°"],
            ["Mean Slope", f"{self.data.terrain.mean_slope:.1f}°"],
            ["Dominant Aspect", self.data.terrain.dominant_aspect],
            ["Buildable Area", f"{self.data.terrain.buildable_area_percent:.1f}%"],
        ]

        slope_table = self._create_table(slope_data, [2.5 * inch, 2 * inch])
        self.story.append(slope_table)
        self.story.append(Spacer(1, 0.25 * inch))

        # Slope classification
        if self.data.terrain.slope_class_distribution:
            self.story.append(
                Paragraph("Slope Classification", self.styles["SubsectionHeader"])
            )

            class_data = [["Slope Class", "Area %"]]
            for cls, pct in self.data.terrain.slope_class_distribution.items():
                class_data.append([cls, f"{pct:.1f}%"])

            class_table = self._create_table(class_data, [3 * inch, 1.5 * inch])
            self.story.append(class_table)

    def _add_asset_schedule(self):
        """Add asset schedule section."""
        if not self.data.assets:
            return

        self.story.append(Paragraph("Asset Schedule", self.styles["SectionHeader"]))

        # Summary
        total_footprint = sum(a.area_m2 for a in self.data.assets)
        valid_count = sum(1 for a in self.data.assets if a.is_valid)

        summary = f"""
        Total assets: {len(self.data.assets)}<br/>
        Total footprint: {total_footprint:,.0f} m²<br/>
        Valid placements: {valid_count} ({100*valid_count/len(self.data.assets):.0f}%)
        """
        self.story.append(Paragraph(summary, self.styles["BodyText"]))
        self.story.append(Spacer(1, 0.15 * inch))

        # Asset table
        asset_data = [
            [
                "ID",
                "Type",
                "Dimensions (m)",
                "Area (m²)",
                "Cut (m³)",
                "Fill (m³)",
                "Net (m³)",
            ]
        ]

        for asset in self.data.assets:
            dims = f"{asset.dimensions[0]:.0f} x {asset.dimensions[1]:.0f}"
            asset_data.append(
                [
                    asset.asset_id[:8],
                    asset.asset_type.replace("_", " ").title(),
                    dims,
                    f"{asset.area_m2:,.0f}",
                    f"{asset.cut_volume:,.0f}",
                    f"{asset.fill_volume:,.0f}",
                    f"{asset.net_earthwork:,.0f}",
                ]
            )

        col_widths = [
            0.7 * inch,
            1.2 * inch,
            1 * inch,
            0.8 * inch,
            0.8 * inch,
            0.8 * inch,
            0.8 * inch,
        ]
        asset_table = self._create_table(asset_data, col_widths)
        self.story.append(asset_table)

    def _add_earthwork_summary(self):
        """Add earthwork summary section."""
        if not self.data.earthwork:
            return

        self.story.append(Paragraph("Earthwork Summary", self.styles["SectionHeader"]))

        ew = self.data.earthwork

        # Volume summary
        self.story.append(Paragraph("Volume Summary", self.styles["SubsectionHeader"]))

        vol_data = [
            ["Item", "Volume (m³)"],
            ["Total Cut", f"{ew.total_cut_volume:,.0f}"],
            ["Total Fill", f"{ew.total_fill_volume:,.0f}"],
            ["Net Balance", f"{ew.net_volume:,.0f}"],
            ["", ""],
            ["Adjusted Cut (shrink factor)", f"{ew.adjusted_cut:,.0f}"],
            ["Adjusted Fill (swell factor)", f"{ew.adjusted_fill:,.0f}"],
            ["", ""],
            ["Import Required", f"{ew.import_required:,.0f}"],
            ["Export Required", f"{ew.export_required:,.0f}"],
            ["Balanced On-Site", f"{ew.balance_on_site:,.0f}"],
        ]

        vol_table = self._create_table(vol_data, [3.5 * inch, 2 * inch])
        self.story.append(vol_table)
        self.story.append(Spacer(1, 0.15 * inch))

        # Notes
        notes = f"""
        <b>Notes:</b><br/>
        - Shrink factor applied: {ew.shrink_factor}<br/>
        - Swell factor applied: {ew.swell_factor}<br/>
        - Positive net balance indicates excess cut material<br/>
        - Negative net balance indicates fill material required
        """
        self.story.append(Paragraph(notes, self.styles["BodyText"]))

    def _add_cost_estimate(self):
        """Add cost estimate section."""
        if not self.data.costs:
            return

        self.story.append(Paragraph("Cost Estimate", self.styles["SectionHeader"]))

        costs = self.data.costs

        cost_data = [
            ["Item", "Cost ($)"],
            ["Excavation (Cut)", f"${costs.cut_cost:,.0f}"],
            ["Fill Placement", f"${costs.fill_cost:,.0f}"],
            ["On-Site Hauling", f"${costs.haul_cost:,.0f}"],
            ["Material Import", f"${costs.import_cost:,.0f}"],
            ["Material Export", f"${costs.export_cost:,.0f}"],
            ["Subtotal (Earthwork)", f"${costs.total_earthwork_cost:,.0f}"],
        ]

        if costs.road_cost:
            cost_data.append(["Road Construction", f"${costs.road_cost:,.0f}"])

        cost_data.extend(
            [
                [
                    f"Contingency ({costs.contingency_percent:.0f}%)",
                    f"${costs.contingency_amount:,.0f}",
                ],
                ["TOTAL", f"${costs.total_cost:,.0f}"],
            ]
        )

        cost_table = self._create_table(cost_data, [3.5 * inch, 2 * inch])

        # Highlight total row
        cost_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (-1, -1), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (-1, -1), (-1, -1), 11),
                    ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
                ]
            )
        )

        self.story.append(cost_table)
        self.story.append(Spacer(1, 0.25 * inch))

        # Disclaimer
        disclaimer = """
        <i>Note: This cost estimate is preliminary and based on assumed unit costs.
        Actual costs may vary based on site conditions, material availability,
        and market conditions. A detailed cost estimate should be prepared
        during the detailed design phase.</i>
        """
        self.story.append(Paragraph(disclaimer, self.styles["BodyText"]))

    def _add_road_network(self):
        """Add road network section."""
        if not self.data.roads:
            return

        self.story.append(Paragraph("Road Network", self.styles["SectionHeader"]))

        # Summary
        total_length = sum(r.length_m for r in self.data.roads)
        max_gradient = (
            max(r.gradient_percent for r in self.data.roads) if self.data.roads else 0
        )

        summary = f"""
        Total road length: {total_length:,.0f} m<br/>
        Number of segments: {len(self.data.roads)}<br/>
        Maximum gradient: {max_gradient:.1f}%
        """
        self.story.append(Paragraph(summary, self.styles["BodyText"]))
        self.story.append(Spacer(1, 0.15 * inch))

        # Road segment table
        road_data = [
            [
                "Segment",
                "Length (m)",
                "Width (m)",
                "Gradient (%)",
                "Cut (m³)",
                "Fill (m³)",
            ]
        ]

        for i, road in enumerate(self.data.roads):
            road_data.append(
                [
                    f"Seg {i+1}",
                    f"{road.length_m:.0f}",
                    f"{road.width_m:.1f}",
                    f"{road.gradient_percent:.1f}",
                    f"{road.cut_volume:.0f}",
                    f"{road.fill_volume:.0f}",
                ]
            )

        col_widths = [0.8 * inch, 1 * inch, 0.9 * inch, 1 * inch, 1 * inch, 1 * inch]
        road_table = self._create_table(road_data, col_widths)
        self.story.append(road_table)

    def _add_maps(self):
        """Add map images to report."""
        for map_img in self.data.maps:
            self.story.append(PageBreak())
            self.story.append(Paragraph(map_img.title, self.styles["SectionHeader"]))

            if map_img.caption:
                self.story.append(Paragraph(map_img.caption, self.styles["BodyText"]))

            # Add image
            img = Image(
                io.BytesIO(map_img.image_data),
                width=map_img.width_inches * inch,
                height=map_img.height_inches * inch,
            )
            self.story.append(img)

            if map_img.scale:
                self.story.append(
                    Paragraph(f"Scale: {map_img.scale}", self.styles["BodyText"])
                )

    def _create_table(self, data: List[List], col_widths: List[float]) -> Table:
        """Create a styled table."""
        table = Table(data, colWidths=col_widths)
        table.setStyle(
            TableStyle(
                [
                    # Header row
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                    # Data rows
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("ALIGN", (0, 1), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    # Borders
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    # Alternating row colors
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f5f5f5")],
                    ),
                    # Padding
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        return table

    def generate(self) -> ReportResult:
        """Generate the PDF report."""
        start_time = time.time()

        try:
            # Create PDF buffer
            buffer = io.BytesIO()

            # Create document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=self._get_page_size(),
                rightMargin=0.75 * inch,
                leftMargin=0.75 * inch,
                topMargin=0.75 * inch,
                bottomMargin=0.75 * inch,
            )

            # Build story based on config sections
            for section in self.config.sections:
                if section == ReportSection.COVER:
                    self._add_cover_page()
                elif section == ReportSection.EXECUTIVE_SUMMARY:
                    self._add_executive_summary()
                elif section == ReportSection.TERRAIN_ANALYSIS:
                    self._add_terrain_analysis()
                elif section == ReportSection.ASSET_SCHEDULE:
                    self._add_asset_schedule()
                elif section == ReportSection.EARTHWORK_SUMMARY:
                    self._add_earthwork_summary()
                elif section == ReportSection.COST_ESTIMATE:
                    self._add_cost_estimate()
                elif section == ReportSection.ROAD_NETWORK:
                    self._add_road_network()

            # Add maps
            if self.data.maps:
                self._add_maps()

            # Build PDF
            doc.build(self.story)

            # Get PDF data
            pdf_data = buffer.getvalue()
            buffer.close()

            # Calculate generation time
            generation_time = (time.time() - start_time) * 1000

            # Generate filename
            filename = f"{self.data.project.project_name.replace(' ', '_')}_Report_{datetime.now().strftime('%Y%m%d')}.pdf"

            return ReportResult(
                success=True,
                filename=filename,
                file_size=len(pdf_data),
                page_count=len(self.story) // 10 + 1,  # Approximate
                generation_time_ms=generation_time,
                pdf_data=pdf_data,
            )

        except Exception as e:
            return ReportResult(
                success=False,
                filename="",
                file_size=0,
                page_count=0,
                generation_time_ms=(time.time() - start_time) * 1000,
                error=str(e),
            )


def generate_report(data: ReportData) -> ReportResult:
    """
    Generate a PDF report from the provided data.

    Args:
        data: Complete report data

    Returns:
        ReportResult with PDF data or error
    """
    generator = PDFReportGenerator(data)
    return generator.generate()
