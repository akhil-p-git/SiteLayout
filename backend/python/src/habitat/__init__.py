"""
Habitat Module

Environmental habitat analysis for endangered species and wetlands.
"""

from .models import (
    SpeciesStatus,
    TaxonomicGroup,
    WetlandType,
    HabitatSensitivity,
    PermitType,
    Species,
    CriticalHabitat,
    Wetland,
    BufferZone,
    HabitatImpactScore,
    HabitatOverlayResult,
    BUFFER_DISTANCES,
    PERMIT_TIMELINES,
)

from .services import (
    USFWSService,
    NWIService,
    HabitatImpactCalculator,
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
