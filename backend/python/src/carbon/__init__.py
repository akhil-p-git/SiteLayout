"""
Carbon Calculator Module

Construction carbon footprint and lifetime impact calculations.
"""

from .calculator import (
    CarbonCalculator,
    calculate_project_carbon,
)
from .models import (
    DEFAULT_EQUIPMENT_PROFILES,
    CarbonBreakdown,
    CarbonCalculationResult,
    CarbonOffsetResult,
    EarthworkCarbonInput,
    EnergySource,
    EPAEmissionFactors,
    EquipmentEmissionProfile,
    EquipmentType,
    FuelType,
    GridEmissionFactors,
    HaulingParameters,
    LifetimeImpactResult,
    ProjectEnergyProfile,
    RoadConstructionInput,
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
