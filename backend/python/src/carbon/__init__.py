"""
Carbon Calculator Module

Construction carbon footprint and lifetime impact calculations.
"""

from .models import (
    EquipmentType,
    FuelType,
    EnergySource,
    EPAEmissionFactors,
    EquipmentEmissionProfile,
    DEFAULT_EQUIPMENT_PROFILES,
    HaulingParameters,
    EarthworkCarbonInput,
    RoadConstructionInput,
    ProjectEnergyProfile,
    GridEmissionFactors,
    CarbonBreakdown,
    CarbonOffsetResult,
    LifetimeImpactResult,
    CarbonCalculationResult,
)

from .calculator import (
    CarbonCalculator,
    calculate_project_carbon,
)

__all__ = [
    # Enums
    "EquipmentType",
    "FuelType",
    "EnergySource",
    # Data classes
    "EPAEmissionFactors",
    "EquipmentEmissionProfile",
    "DEFAULT_EQUIPMENT_PROFILES",
    "HaulingParameters",
    "EarthworkCarbonInput",
    "RoadConstructionInput",
    "ProjectEnergyProfile",
    "GridEmissionFactors",
    # Results
    "CarbonBreakdown",
    "CarbonOffsetResult",
    "LifetimeImpactResult",
    "CarbonCalculationResult",
    # Calculator
    "CarbonCalculator",
    "calculate_project_carbon",
]
