"""
Habitat Data Models

Data models for endangered species, wetlands, and habitat impact assessment.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple


class SpeciesStatus(Enum):
    """USFWS listing status for species."""
    ENDANGERED = "endangered"
    THREATENED = "threatened"
    CANDIDATE = "candidate"
    PROPOSED_ENDANGERED = "proposed_endangered"
    PROPOSED_THREATENED = "proposed_threatened"
    UNDER_REVIEW = "under_review"
    DELISTED = "delisted"


class TaxonomicGroup(Enum):
    """Taxonomic groups for species classification."""
    MAMMALS = "mammals"
    BIRDS = "birds"
    REPTILES = "reptiles"
    AMPHIBIANS = "amphibians"
    FISH = "fish"
    INVERTEBRATES = "invertebrates"
    PLANTS = "plants"


class WetlandType(Enum):
    """NWI Wetland classification types (Cowardin system)."""
    PALUSTRINE_EMERGENT = "PEM"  # Freshwater emergent wetland
    PALUSTRINE_FORESTED = "PFO"  # Freshwater forested wetland
    PALUSTRINE_SCRUB_SHRUB = "PSS"  # Freshwater shrub wetland
    PALUSTRINE_UNCONSOLIDATED = "PUB"  # Freshwater pond
    LACUSTRINE = "L"  # Lake
    RIVERINE = "R"  # River/stream
    ESTUARINE = "E"  # Saltwater/brackish
    MARINE = "M"  # Ocean/nearshore


class HabitatSensitivity(Enum):
    """Habitat sensitivity levels."""
    CRITICAL = "critical"  # Critical habitat, no development
    HIGH = "high"  # Significant restrictions
    MODERATE = "moderate"  # Some restrictions, permits required
    LOW = "low"  # Minor considerations
    NONE = "none"  # No significant habitat concerns


class PermitType(Enum):
    """Environmental permit types."""
    SECTION_7_CONSULTATION = "section_7"  # ESA Section 7
    SECTION_10_PERMIT = "section_10"  # ESA Section 10 (incidental take)
    SECTION_404_PERMIT = "section_404"  # Clean Water Act wetlands
    NEPA_EA = "nepa_ea"  # Environmental Assessment
    NEPA_EIS = "nepa_eis"  # Environmental Impact Statement
    STATE_WETLAND = "state_wetland"  # State wetland permit
    MIGRATORY_BIRD = "migratory_bird"  # Migratory Bird Treaty Act
    EAGLE_TAKE = "eagle_take"  # Bald/Golden Eagle permit


@dataclass
class Species:
    """Endangered or threatened species record."""
    scientific_name: str
    common_name: str
    status: SpeciesStatus
    taxonomic_group: TaxonomicGroup
    critical_habitat: bool = False
    critical_habitat_area_km2: float = 0.0
    recovery_plan: bool = False
    listing_date: Optional[str] = None
    population_estimate: Optional[int] = None
    threats: List[str] = field(default_factory=list)


@dataclass
class CriticalHabitat:
    """Critical habitat designation area."""
    species_name: str
    unit_name: str
    unit_id: str
    area_km2: float
    designation_date: str
    boundary_geojson: Optional[Dict[str, Any]] = None
    primary_constituent_elements: List[str] = field(default_factory=list)


@dataclass
class Wetland:
    """NWI Wetland record."""
    wetland_id: str
    wetland_type: WetlandType
    classification_code: str  # Full NWI code (e.g., PEM1A)
    area_m2: float
    water_regime: str  # A=temporary, B=seasonal, C=semi-permanent, etc.
    special_modifier: Optional[str] = None  # d=partly drained, f=farmed, etc.
    boundary_geojson: Optional[Dict[str, Any]] = None

    @property
    def type_label(self) -> str:
        """Get human-readable wetland type label."""
        labels = {
            WetlandType.PALUSTRINE_EMERGENT: "Freshwater Emergent Wetland",
            WetlandType.PALUSTRINE_FORESTED: "Freshwater Forested Wetland",
            WetlandType.PALUSTRINE_SCRUB_SHRUB: "Freshwater Shrub Wetland",
            WetlandType.PALUSTRINE_UNCONSOLIDATED: "Freshwater Pond",
            WetlandType.LACUSTRINE: "Lake",
            WetlandType.RIVERINE: "River/Stream",
            WetlandType.ESTUARINE: "Estuarine Wetland",
            WetlandType.MARINE: "Marine",
        }
        return labels.get(self.wetland_type, self.classification_code)


@dataclass
class BufferZone:
    """Buffer zone around sensitive habitat."""
    source_type: str  # wetland, critical_habitat, etc.
    source_id: str
    buffer_distance_m: float
    restriction_level: HabitatSensitivity
    notes: Optional[str] = None


@dataclass
class HabitatImpactScore:
    """Calculated habitat impact score for a site."""
    site_id: str
    overall_score: float  # 0-100, lower = more impact
    sensitivity_level: HabitatSensitivity

    # Component scores
    species_impact: float
    wetland_impact: float
    critical_habitat_impact: float
    buffer_zone_impact: float

    # Counts
    endangered_species_count: int
    threatened_species_count: int
    wetland_area_m2: float
    critical_habitat_area_m2: float
    buffer_zone_overlap_m2: float

    # Permits likely required
    permits_required: List[PermitType] = field(default_factory=list)
    estimated_review_months: int = 0


@dataclass
class HabitatOverlayResult:
    """Result of habitat overlay analysis for a site."""
    site_id: str
    analysis_date: str
    site_boundary_geojson: Dict[str, Any]

    # Species data
    species_in_range: List[Species] = field(default_factory=list)
    critical_habitats: List[CriticalHabitat] = field(default_factory=list)

    # Wetland data
    wetlands: List[Wetland] = field(default_factory=list)
    total_wetland_area_m2: float = 0.0
    wetland_types_present: List[WetlandType] = field(default_factory=list)

    # Buffer zones
    buffer_zones: List[BufferZone] = field(default_factory=list)

    # Impact assessment
    impact_score: Optional[HabitatImpactScore] = None

    # Data quality
    data_sources: List[str] = field(default_factory=list)
    data_date: Optional[str] = None
    confidence_level: str = "medium"  # low, medium, high

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "site_id": self.site_id,
            "analysis_date": self.analysis_date,
            "species": {
                "count": len(self.species_in_range),
                "endangered": len([s for s in self.species_in_range if s.status == SpeciesStatus.ENDANGERED]),
                "threatened": len([s for s in self.species_in_range if s.status == SpeciesStatus.THREATENED]),
                "list": [
                    {
                        "scientific_name": s.scientific_name,
                        "common_name": s.common_name,
                        "status": s.status.value,
                        "group": s.taxonomic_group.value,
                        "critical_habitat": s.critical_habitat,
                    }
                    for s in self.species_in_range
                ],
            },
            "critical_habitats": {
                "count": len(self.critical_habitats),
                "total_area_km2": sum(ch.area_km2 for ch in self.critical_habitats),
                "list": [
                    {
                        "species": ch.species_name,
                        "unit": ch.unit_name,
                        "area_km2": ch.area_km2,
                    }
                    for ch in self.critical_habitats
                ],
            },
            "wetlands": {
                "count": len(self.wetlands),
                "total_area_m2": self.total_wetland_area_m2,
                "total_area_ha": self.total_wetland_area_m2 / 10000,
                "types_present": [wt.value for wt in self.wetland_types_present],
                "list": [
                    {
                        "id": w.wetland_id,
                        "type": w.type_label,
                        "code": w.classification_code,
                        "area_m2": w.area_m2,
                    }
                    for w in self.wetlands
                ],
            },
            "buffer_zones": {
                "count": len(self.buffer_zones),
                "list": [
                    {
                        "source_type": bz.source_type,
                        "buffer_m": bz.buffer_distance_m,
                        "restriction": bz.restriction_level.value,
                    }
                    for bz in self.buffer_zones
                ],
            },
            "impact_score": self.impact_score.__dict__ if self.impact_score else None,
            "data_quality": {
                "sources": self.data_sources,
                "date": self.data_date,
                "confidence": self.confidence_level,
            },
        }


# Standard buffer distances (meters)
BUFFER_DISTANCES = {
    "critical_habitat": 500,
    "wetland_large": 100,  # > 0.5 ha
    "wetland_small": 50,   # < 0.5 ha
    "stream_perennial": 100,
    "stream_intermittent": 50,
    "eagle_nest": 200,
    "colonial_bird_rookery": 300,
}

# Permit timeline estimates (months)
PERMIT_TIMELINES = {
    PermitType.SECTION_7_CONSULTATION: 6,
    PermitType.SECTION_10_PERMIT: 12,
    PermitType.SECTION_404_PERMIT: 8,
    PermitType.NEPA_EA: 6,
    PermitType.NEPA_EIS: 18,
    PermitType.STATE_WETLAND: 4,
    PermitType.MIGRATORY_BIRD: 3,
    PermitType.EAGLE_TAKE: 12,
}
