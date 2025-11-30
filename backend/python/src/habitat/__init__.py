"""
Habitat Module

Environmental habitat analysis for endangered species and wetlands.
"""

from .models import (
    BUFFER_DISTANCES,
    PERMIT_TIMELINES,
    BufferZone,
    CriticalHabitat,
    HabitatImpactScore,
    HabitatOverlayResult,
    HabitatSensitivity,
    PermitType,
    Species,
    SpeciesStatus,
    TaxonomicGroup,
    Wetland,
    WetlandType,
)
from .services import (
    HabitatImpactCalculator,
    NWIService,
    USFWSService,
    analyze_habitat,
)

__all__ = [
    # Enums
    "SpeciesStatus",
    "TaxonomicGroup",
    "WetlandType",
    "HabitatSensitivity",
    "PermitType",
    # Data classes
    "Species",
    "CriticalHabitat",
    "Wetland",
    "BufferZone",
    "HabitatImpactScore",
    "HabitatOverlayResult",
    # Constants
    "BUFFER_DISTANCES",
    "PERMIT_TIMELINES",
    # Services
    "USFWSService",
    "NWIService",
    "HabitatImpactCalculator",
    "analyze_habitat",
]
