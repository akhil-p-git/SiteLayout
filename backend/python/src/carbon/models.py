"""
Carbon Calculator Models

Data models for construction carbon footprint and lifetime impact calculations.
Based on EPA emission factors and industry standards.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any


class EquipmentType(Enum):
    """Construction equipment types for emission calculations."""

    EXCAVATOR = "excavator"
    BULLDOZER = "bulldozer"
    LOADER = "loader"
    GRADER = "grader"
    COMPACTOR = "compactor"
    DUMP_TRUCK = "dump_truck"
    SCRAPER = "scraper"
    CRANE = "crane"
    CONCRETE_MIXER = "concrete_mixer"
    PILE_DRIVER = "pile_driver"


class FuelType(Enum):
    """Fuel types for emission calculations."""

    DIESEL = "diesel"
    GASOLINE = "gasoline"
    BIODIESEL_B20 = "biodiesel_b20"
    NATURAL_GAS = "natural_gas"
    ELECTRIC = "electric"


class EnergySource(Enum):
    """Energy sources for grid comparison."""

    SOLAR = "solar"
    WIND = "wind"
    NATURAL_GAS_GRID = "natural_gas_grid"
    COAL = "coal"
    NUCLEAR = "nuclear"
    HYDRO = "hydro"
    US_AVERAGE_GRID = "us_average_grid"


@dataclass
class EPAEmissionFactors:
    """
    EPA emission factors for various fuels (kg CO2 per unit).
    Sources:
    - EPA GHG Emission Factors Hub (2023)
    - EPA AP-42 Emission Factors
    """

    # Stationary combustion (kg CO2 per gallon)
    diesel_kg_per_gallon: float = 10.21
    gasoline_kg_per_gallon: float = 8.78
    biodiesel_b20_kg_per_gallon: float = 8.17  # 20% reduction
    natural_gas_kg_per_therm: float = 5.31

    # Mobile combustion (kg CO2 per gallon) - slightly different due to engine efficiency
    diesel_mobile_kg_per_gallon: float = 10.21
    gasoline_mobile_kg_per_gallon: float = 8.78

    # Electricity (kg CO2 per kWh) - varies by region
    electricity_us_avg_kg_per_kwh: float = 0.386  # US average 2023
    electricity_clean_kg_per_kwh: float = 0.0  # Solar/wind

    # Material production (kg CO2 per metric ton)
    concrete_kg_per_ton: float = 410.0
    steel_kg_per_ton: float = 1850.0
    asphalt_kg_per_ton: float = 45.0
    gravel_kg_per_ton: float = 5.0


@dataclass
class EquipmentEmissionProfile:
    """Emission profile for construction equipment."""

    equipment_type: EquipmentType
    fuel_type: FuelType
    fuel_consumption_per_hour: float  # gallons/hour
    operating_hours_per_day: float = 8.0
    utilization_factor: float = 0.85  # actual work time vs idle

    def daily_fuel_consumption(self) -> float:
        """Calculate daily fuel consumption in gallons."""
        return (
            self.fuel_consumption_per_hour
            * self.operating_hours_per_day
            * self.utilization_factor
        )


# Default equipment profiles based on industry averages
DEFAULT_EQUIPMENT_PROFILES: Dict[EquipmentType, EquipmentEmissionProfile] = {
    EquipmentType.EXCAVATOR: EquipmentEmissionProfile(
        EquipmentType.EXCAVATOR, FuelType.DIESEL, 6.0
    ),
    EquipmentType.BULLDOZER: EquipmentEmissionProfile(
        EquipmentType.BULLDOZER, FuelType.DIESEL, 8.0
    ),
    EquipmentType.LOADER: EquipmentEmissionProfile(
        EquipmentType.LOADER, FuelType.DIESEL, 5.0
    ),
    EquipmentType.GRADER: EquipmentEmissionProfile(
        EquipmentType.GRADER, FuelType.DIESEL, 4.5
    ),
    EquipmentType.COMPACTOR: EquipmentEmissionProfile(
        EquipmentType.COMPACTOR, FuelType.DIESEL, 3.5
    ),
    EquipmentType.DUMP_TRUCK: EquipmentEmissionProfile(
        EquipmentType.DUMP_TRUCK, FuelType.DIESEL, 4.0
    ),
    EquipmentType.SCRAPER: EquipmentEmissionProfile(
        EquipmentType.SCRAPER, FuelType.DIESEL, 10.0
    ),
}


@dataclass
class HaulingParameters:
    """Parameters for material hauling emissions."""

    haul_distance_km: float  # one-way distance
    truck_capacity_m3: float = 15.0
    fuel_efficiency_km_per_liter: float = 2.5  # loaded
    return_efficiency_factor: float = 1.3  # empty return is more efficient

    def trips_required(self, volume_m3: float) -> int:
        """Calculate number of round trips needed."""
        return max(1, int(volume_m3 / self.truck_capacity_m3) + 1)

    def total_distance_km(self, volume_m3: float) -> float:
        """Calculate total haul distance for given volume."""
        trips = self.trips_required(volume_m3)
        return trips * self.haul_distance_km * 2  # round trip


@dataclass
class EarthworkCarbonInput:
    """Input data for earthwork carbon calculations."""

    cut_volume_m3: float
    fill_volume_m3: float
    import_volume_m3: float = 0.0
    export_volume_m3: float = 0.0
    hauling: Optional[HaulingParameters] = None
    equipment_days: Dict[EquipmentType, int] = field(default_factory=dict)
    custom_equipment: List[EquipmentEmissionProfile] = field(default_factory=list)


@dataclass
class RoadConstructionInput:
    """Input data for road construction carbon calculations."""

    total_length_m: float
    width_m: float
    pavement_depth_m: float = 0.15
    base_depth_m: float = 0.30
    material_type: str = "asphalt"  # asphalt or concrete

    @property
    def pavement_volume_m3(self) -> float:
        """Calculate pavement volume."""
        return self.total_length_m * self.width_m * self.pavement_depth_m

    @property
    def base_volume_m3(self) -> float:
        """Calculate base material volume."""
        return self.total_length_m * self.width_m * self.base_depth_m


@dataclass
class ProjectEnergyProfile:
    """Energy generation profile for solar/wind projects."""

    capacity_mw: float  # nameplate capacity
    capacity_factor: float = 0.25  # typical for solar
    energy_source: EnergySource = EnergySource.SOLAR
    project_lifetime_years: int = 25
    annual_degradation_percent: float = 0.5  # panel degradation

    def annual_generation_mwh(self, year: int = 1) -> float:
        """Calculate annual energy generation for given year."""
        degradation = (1 - self.annual_degradation_percent / 100) ** (year - 1)
        return self.capacity_mw * 8760 * self.capacity_factor * degradation

    def lifetime_generation_mwh(self) -> float:
        """Calculate total lifetime energy generation."""
        return sum(
            self.annual_generation_mwh(year)
            for year in range(1, self.project_lifetime_years + 1)
        )


@dataclass
class GridEmissionFactors:
    """Grid emission factors for carbon offset calculations."""

    # kg CO2 per MWh by energy source
    source_factors: Dict[EnergySource, float] = field(
        default_factory=lambda: {
            EnergySource.SOLAR: 0.0,
            EnergySource.WIND: 0.0,
            EnergySource.NATURAL_GAS_GRID: 410.0,
            EnergySource.COAL: 820.0,
            EnergySource.NUCLEAR: 12.0,
            EnergySource.HYDRO: 24.0,
            EnergySource.US_AVERAGE_GRID: 386.0,
        }
    )

    def get_factor(self, source: EnergySource) -> float:
        """Get emission factor for energy source."""
        return self.source_factors.get(source, 386.0)


@dataclass
class CarbonBreakdown:
    """Detailed carbon emissions breakdown."""

    equipment_emissions_kg: float = 0.0
    hauling_emissions_kg: float = 0.0
    material_emissions_kg: float = 0.0
    road_construction_kg: float = 0.0

    @property
    def total_construction_kg(self) -> float:
        """Total construction phase emissions."""
        return (
            self.equipment_emissions_kg
            + self.hauling_emissions_kg
            + self.material_emissions_kg
            + self.road_construction_kg
        )

    @property
    def total_construction_metric_tons(self) -> float:
        """Total construction emissions in metric tons."""
        return self.total_construction_kg / 1000.0


@dataclass
class CarbonOffsetResult:
    """Carbon offset from clean energy generation."""

    annual_offset_kg: float
    lifetime_offset_kg: float
    grid_baseline: EnergySource
    grid_factor_kg_per_mwh: float

    @property
    def annual_offset_metric_tons(self) -> float:
        return self.annual_offset_kg / 1000.0

    @property
    def lifetime_offset_metric_tons(self) -> float:
        return self.lifetime_offset_kg / 1000.0


@dataclass
class LifetimeImpactResult:
    """Net carbon impact over project lifetime."""

    construction_emissions_kg: float
    operational_offset_kg: float
    net_impact_kg: float
    payback_years: Optional[float]  # years to offset construction
    project_lifetime_years: int
    carbon_negative_years: int  # years where project is net negative

    @property
    def net_impact_metric_tons(self) -> float:
        return self.net_impact_kg / 1000.0

    @property
    def is_carbon_negative(self) -> bool:
        """True if project offsets more than it emits."""
        return self.net_impact_kg < 0


@dataclass
class CarbonCalculationResult:
    """Complete carbon calculation result."""

    project_id: str
    construction: CarbonBreakdown
    offset: Optional[CarbonOffsetResult] = None
    lifetime: Optional[LifetimeImpactResult] = None

    # Summary metrics
    total_construction_metric_tons: float = 0.0
    total_offset_metric_tons: float = 0.0
    net_lifetime_metric_tons: float = 0.0
    carbon_payback_years: Optional[float] = None

    # Comparison metrics
    equivalent_car_years: float = 0.0  # avg car = 4.6 metric tons/year
    equivalent_trees_planted: float = 0.0  # tree absorbs ~22 kg/year
    equivalent_homes_powered: float = 0.0  # avg home = 7.5 MWh/year

    def calculate_equivalents(self):
        """Calculate human-readable equivalents."""
        # Construction impact equivalents
        self.equivalent_car_years = self.total_construction_metric_tons / 4.6
        self.equivalent_trees_planted = (
            self.total_construction_metric_tons * 1000
        ) / 22

        # If we have offset data, calculate homes powered
        if self.offset:
            annual_mwh = (
                self.offset.annual_offset_kg / self.offset.grid_factor_kg_per_mwh
            )
            self.equivalent_homes_powered = annual_mwh / 7.5

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        result = {
            "project_id": self.project_id,
            "construction": {
                "equipment_emissions_kg": self.construction.equipment_emissions_kg,
                "hauling_emissions_kg": self.construction.hauling_emissions_kg,
                "material_emissions_kg": self.construction.material_emissions_kg,
                "road_construction_kg": self.construction.road_construction_kg,
                "total_kg": self.construction.total_construction_kg,
                "total_metric_tons": self.construction.total_construction_metric_tons,
            },
            "total_construction_metric_tons": self.total_construction_metric_tons,
            "equivalents": {
                "car_years": round(self.equivalent_car_years, 1),
                "trees_to_offset": round(self.equivalent_trees_planted, 0),
                "homes_powered_annually": round(self.equivalent_homes_powered, 1),
            },
        }

        if self.offset:
            result["offset"] = {
                "annual_offset_kg": self.offset.annual_offset_kg,
                "annual_offset_metric_tons": self.offset.annual_offset_metric_tons,
                "lifetime_offset_kg": self.offset.lifetime_offset_kg,
                "lifetime_offset_metric_tons": self.offset.lifetime_offset_metric_tons,
                "grid_baseline": self.offset.grid_baseline.value,
            }

        if self.lifetime:
            result["lifetime"] = {
                "construction_emissions_metric_tons": self.lifetime.construction_emissions_kg
                / 1000,
                "operational_offset_metric_tons": self.lifetime.operational_offset_kg
                / 1000,
                "net_impact_metric_tons": self.lifetime.net_impact_metric_tons,
                "payback_years": self.lifetime.payback_years,
                "project_lifetime_years": self.lifetime.project_lifetime_years,
                "is_carbon_negative": self.lifetime.is_carbon_negative,
            }
            result["net_lifetime_metric_tons"] = self.net_lifetime_metric_tons
            result["carbon_payback_years"] = self.carbon_payback_years

        return result
