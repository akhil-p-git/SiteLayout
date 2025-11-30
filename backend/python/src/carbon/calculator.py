"""
Carbon Calculator

Construction carbon footprint and lifetime impact calculations.
"""

from typing import Optional, Dict, List
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


class CarbonCalculator:
    """
    Carbon footprint calculator for construction projects.

    Calculates emissions from:
    - Construction equipment operation
    - Material hauling
    - Material production
    - Road construction

    And offsets from:
    - Clean energy generation over project lifetime
    """

    def __init__(
        self,
        emission_factors: Optional[EPAEmissionFactors] = None,
        grid_factors: Optional[GridEmissionFactors] = None,
    ):
        self.emission_factors = emission_factors or EPAEmissionFactors()
        self.grid_factors = grid_factors or GridEmissionFactors()

    def calculate_equipment_emissions(
        self,
        equipment_days: Dict[EquipmentType, int],
        custom_equipment: Optional[List[EquipmentEmissionProfile]] = None,
    ) -> float:
        """
        Calculate CO2 emissions from construction equipment operation.

        Args:
            equipment_days: Dict mapping equipment type to operating days
            custom_equipment: Optional custom equipment profiles

        Returns:
            Total emissions in kg CO2
        """
        total_emissions = 0.0

        # Calculate from standard equipment
        for equipment_type, days in equipment_days.items():
            profile = DEFAULT_EQUIPMENT_PROFILES.get(equipment_type)
            if profile:
                daily_fuel = profile.daily_fuel_consumption()
                total_fuel = daily_fuel * days

                # Get emission factor based on fuel type
                emission_factor = self._get_fuel_emission_factor(profile.fuel_type)
                total_emissions += total_fuel * emission_factor

        # Calculate from custom equipment
        if custom_equipment:
            for profile in custom_equipment:
                # Assume 1 day operation if not specified
                daily_fuel = profile.daily_fuel_consumption()
                emission_factor = self._get_fuel_emission_factor(profile.fuel_type)
                total_emissions += daily_fuel * emission_factor

        return total_emissions

    def calculate_hauling_emissions(
        self,
        volume_m3: float,
        hauling: HaulingParameters,
    ) -> float:
        """
        Calculate CO2 emissions from material hauling.

        Args:
            volume_m3: Total volume to haul in cubic meters
            hauling: Hauling parameters

        Returns:
            Total emissions in kg CO2
        """
        if volume_m3 <= 0 or hauling.haul_distance_km <= 0:
            return 0.0

        total_distance = hauling.total_distance_km(volume_m3)

        # Convert km to liters of fuel
        liters_per_km = 1 / hauling.fuel_efficiency_km_per_liter
        total_liters = total_distance * liters_per_km

        # Convert liters to gallons (1 gallon = 3.785 liters)
        total_gallons = total_liters / 3.785

        # Calculate emissions (assume diesel trucks)
        return total_gallons * self.emission_factors.diesel_mobile_kg_per_gallon

    def calculate_material_emissions(
        self,
        concrete_tons: float = 0.0,
        steel_tons: float = 0.0,
        asphalt_tons: float = 0.0,
        gravel_tons: float = 0.0,
    ) -> float:
        """
        Calculate CO2 emissions from material production.

        Args:
            concrete_tons: Metric tons of concrete
            steel_tons: Metric tons of steel
            asphalt_tons: Metric tons of asphalt
            gravel_tons: Metric tons of gravel

        Returns:
            Total emissions in kg CO2
        """
        return (
            concrete_tons * self.emission_factors.concrete_kg_per_ton +
            steel_tons * self.emission_factors.steel_kg_per_ton +
            asphalt_tons * self.emission_factors.asphalt_kg_per_ton +
            gravel_tons * self.emission_factors.gravel_kg_per_ton
        )

    def calculate_road_construction_emissions(
        self,
        road_input: RoadConstructionInput,
    ) -> float:
        """
        Calculate CO2 emissions from road construction.

        Args:
            road_input: Road construction parameters

        Returns:
            Total emissions in kg CO2
        """
        # Calculate material volumes
        pavement_volume = road_input.pavement_volume_m3
        base_volume = road_input.base_volume_m3

        # Convert to metric tons (approximate densities)
        # Asphalt: ~2.4 tons/m3, Concrete: ~2.4 tons/m3, Gravel: ~1.8 tons/m3
        if road_input.material_type == "concrete":
            pavement_tons = pavement_volume * 2.4
            pavement_emissions = pavement_tons * self.emission_factors.concrete_kg_per_ton
        else:  # asphalt
            pavement_tons = pavement_volume * 2.4
            pavement_emissions = pavement_tons * self.emission_factors.asphalt_kg_per_ton

        base_tons = base_volume * 1.8
        base_emissions = base_tons * self.emission_factors.gravel_kg_per_ton

        return pavement_emissions + base_emissions

    def calculate_earthwork_emissions(
        self,
        earthwork: EarthworkCarbonInput,
    ) -> CarbonBreakdown:
        """
        Calculate all emissions from earthwork operations.

        Args:
            earthwork: Earthwork carbon input data

        Returns:
            Carbon breakdown with detailed emissions
        """
        breakdown = CarbonBreakdown()

        # Equipment emissions
        if earthwork.equipment_days:
            breakdown.equipment_emissions_kg = self.calculate_equipment_emissions(
                earthwork.equipment_days,
                earthwork.custom_equipment,
            )
        else:
            # Estimate equipment days based on volume
            estimated_days = self._estimate_equipment_days(
                earthwork.cut_volume_m3,
                earthwork.fill_volume_m3,
            )
            breakdown.equipment_emissions_kg = self.calculate_equipment_emissions(
                estimated_days,
            )

        # Hauling emissions
        if earthwork.hauling:
            haul_volume = earthwork.import_volume_m3 + earthwork.export_volume_m3
            breakdown.hauling_emissions_kg = self.calculate_hauling_emissions(
                haul_volume,
                earthwork.hauling,
            )

        return breakdown

    def calculate_operational_offset(
        self,
        energy_profile: ProjectEnergyProfile,
        grid_baseline: EnergySource = EnergySource.US_AVERAGE_GRID,
    ) -> CarbonOffsetResult:
        """
        Calculate carbon offset from clean energy generation.

        Args:
            energy_profile: Project energy generation profile
            grid_baseline: Grid source being displaced

        Returns:
            Carbon offset result
        """
        grid_factor = self.grid_factors.get_factor(grid_baseline)

        # Annual offset (first year)
        annual_mwh = energy_profile.annual_generation_mwh(1)
        annual_offset_kg = annual_mwh * grid_factor

        # Lifetime offset
        lifetime_mwh = energy_profile.lifetime_generation_mwh()
        lifetime_offset_kg = lifetime_mwh * grid_factor

        return CarbonOffsetResult(
            annual_offset_kg=annual_offset_kg,
            lifetime_offset_kg=lifetime_offset_kg,
            grid_baseline=grid_baseline,
            grid_factor_kg_per_mwh=grid_factor,
        )

    def calculate_lifetime_impact(
        self,
        construction_emissions_kg: float,
        offset: CarbonOffsetResult,
        project_lifetime_years: int = 25,
    ) -> LifetimeImpactResult:
        """
        Calculate net carbon impact over project lifetime.

        Args:
            construction_emissions_kg: Total construction emissions
            offset: Carbon offset from operations
            project_lifetime_years: Project lifetime

        Returns:
            Lifetime impact result
        """
        net_impact = construction_emissions_kg - offset.lifetime_offset_kg

        # Calculate payback period
        payback_years = None
        if offset.annual_offset_kg > 0:
            payback_years = construction_emissions_kg / offset.annual_offset_kg
            if payback_years > project_lifetime_years:
                payback_years = None  # Never pays back within lifetime

        # Calculate carbon negative years
        carbon_negative_years = 0
        if payback_years and payback_years < project_lifetime_years:
            carbon_negative_years = int(project_lifetime_years - payback_years)

        return LifetimeImpactResult(
            construction_emissions_kg=construction_emissions_kg,
            operational_offset_kg=offset.lifetime_offset_kg,
            net_impact_kg=net_impact,
            payback_years=payback_years,
            project_lifetime_years=project_lifetime_years,
            carbon_negative_years=carbon_negative_years,
        )

    def calculate_full_analysis(
        self,
        project_id: str,
        earthwork: Optional[EarthworkCarbonInput] = None,
        road_input: Optional[RoadConstructionInput] = None,
        energy_profile: Optional[ProjectEnergyProfile] = None,
        grid_baseline: EnergySource = EnergySource.US_AVERAGE_GRID,
        additional_materials: Optional[Dict[str, float]] = None,
    ) -> CarbonCalculationResult:
        """
        Perform complete carbon analysis for a project.

        Args:
            project_id: Project identifier
            earthwork: Earthwork input data
            road_input: Road construction input
            energy_profile: Energy generation profile for offset calculation
            grid_baseline: Grid source being displaced
            additional_materials: Additional material quantities in tons

        Returns:
            Complete carbon calculation result
        """
        breakdown = CarbonBreakdown()

        # Calculate earthwork emissions
        if earthwork:
            earthwork_breakdown = self.calculate_earthwork_emissions(earthwork)
            breakdown.equipment_emissions_kg = earthwork_breakdown.equipment_emissions_kg
            breakdown.hauling_emissions_kg = earthwork_breakdown.hauling_emissions_kg

        # Calculate road construction emissions
        if road_input:
            breakdown.road_construction_kg = self.calculate_road_construction_emissions(
                road_input
            )

        # Calculate additional material emissions
        if additional_materials:
            breakdown.material_emissions_kg = self.calculate_material_emissions(
                concrete_tons=additional_materials.get("concrete", 0),
                steel_tons=additional_materials.get("steel", 0),
                asphalt_tons=additional_materials.get("asphalt", 0),
                gravel_tons=additional_materials.get("gravel", 0),
            )

        # Create result
        result = CarbonCalculationResult(
            project_id=project_id,
            construction=breakdown,
        )
        result.total_construction_metric_tons = breakdown.total_construction_metric_tons

        # Calculate offset if energy profile provided
        if energy_profile:
            result.offset = self.calculate_operational_offset(
                energy_profile,
                grid_baseline,
            )
            result.total_offset_metric_tons = result.offset.lifetime_offset_metric_tons

            # Calculate lifetime impact
            result.lifetime = self.calculate_lifetime_impact(
                breakdown.total_construction_kg,
                result.offset,
                energy_profile.project_lifetime_years,
            )
            result.net_lifetime_metric_tons = result.lifetime.net_impact_metric_tons
            result.carbon_payback_years = result.lifetime.payback_years

        # Calculate human-readable equivalents
        result.calculate_equivalents()

        return result

    def _get_fuel_emission_factor(self, fuel_type: FuelType) -> float:
        """Get emission factor for fuel type in kg CO2 per gallon."""
        factors = {
            FuelType.DIESEL: self.emission_factors.diesel_kg_per_gallon,
            FuelType.GASOLINE: self.emission_factors.gasoline_kg_per_gallon,
            FuelType.BIODIESEL_B20: self.emission_factors.biodiesel_b20_kg_per_gallon,
            FuelType.NATURAL_GAS: self.emission_factors.natural_gas_kg_per_therm,
            FuelType.ELECTRIC: 0.0,  # No direct emissions
        }
        return factors.get(fuel_type, self.emission_factors.diesel_kg_per_gallon)

    def _estimate_equipment_days(
        self,
        cut_volume_m3: float,
        fill_volume_m3: float,
    ) -> Dict[EquipmentType, int]:
        """
        Estimate equipment operating days based on earthwork volumes.

        Uses industry-standard productivity rates.
        """
        total_volume = cut_volume_m3 + fill_volume_m3

        # Productivity estimates (m3 per day)
        excavator_productivity = 800  # m3/day
        bulldozer_productivity = 600  # m3/day
        loader_productivity = 500  # m3/day
        compactor_productivity = 1000  # m3/day (for fill)

        # Calculate days
        excavator_days = max(1, int(cut_volume_m3 / excavator_productivity))
        bulldozer_days = max(1, int(total_volume / bulldozer_productivity))
        loader_days = max(1, int(total_volume / loader_productivity / 2))
        compactor_days = max(1, int(fill_volume_m3 / compactor_productivity))

        return {
            EquipmentType.EXCAVATOR: excavator_days,
            EquipmentType.BULLDOZER: bulldozer_days,
            EquipmentType.LOADER: loader_days,
            EquipmentType.COMPACTOR: compactor_days,
        }


def calculate_project_carbon(
    project_id: str,
    cut_volume_m3: float,
    fill_volume_m3: float,
    import_volume_m3: float = 0.0,
    export_volume_m3: float = 0.0,
    haul_distance_km: float = 10.0,
    road_length_m: float = 0.0,
    road_width_m: float = 6.0,
    capacity_mw: float = 0.0,
    capacity_factor: float = 0.25,
    project_lifetime_years: int = 25,
    grid_baseline: str = "us_average_grid",
) -> CarbonCalculationResult:
    """
    Convenience function for quick carbon calculations.

    Args:
        project_id: Project identifier
        cut_volume_m3: Cut volume in cubic meters
        fill_volume_m3: Fill volume in cubic meters
        import_volume_m3: Material import volume
        export_volume_m3: Material export volume
        haul_distance_km: One-way haul distance
        road_length_m: Total road length
        road_width_m: Road width
        capacity_mw: Project energy capacity in MW
        capacity_factor: Capacity factor for energy generation
        project_lifetime_years: Project lifetime in years
        grid_baseline: Grid baseline for offset calculation

    Returns:
        Carbon calculation result
    """
    calculator = CarbonCalculator()

    # Prepare inputs
    hauling = HaulingParameters(haul_distance_km=haul_distance_km) if haul_distance_km > 0 else None

    earthwork = EarthworkCarbonInput(
        cut_volume_m3=cut_volume_m3,
        fill_volume_m3=fill_volume_m3,
        import_volume_m3=import_volume_m3,
        export_volume_m3=export_volume_m3,
        hauling=hauling,
    )

    road_input = None
    if road_length_m > 0:
        road_input = RoadConstructionInput(
            total_length_m=road_length_m,
            width_m=road_width_m,
        )

    energy_profile = None
    if capacity_mw > 0:
        energy_profile = ProjectEnergyProfile(
            capacity_mw=capacity_mw,
            capacity_factor=capacity_factor,
            project_lifetime_years=project_lifetime_years,
        )

    # Map grid baseline string to enum
    grid_source = EnergySource.US_AVERAGE_GRID
    try:
        grid_source = EnergySource(grid_baseline)
    except ValueError:
        pass

    return calculator.calculate_full_analysis(
        project_id=project_id,
        earthwork=earthwork,
        road_input=road_input,
        energy_profile=energy_profile,
        grid_baseline=grid_source,
    )
