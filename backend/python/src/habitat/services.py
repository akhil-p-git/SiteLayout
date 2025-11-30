"""
Habitat Data Services

Services for USFWS and NWI data integration.
"""

import math
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from .models import (
    Species,
    SpeciesStatus,
    TaxonomicGroup,
    CriticalHabitat,
    Wetland,
    WetlandType,
    BufferZone,
    HabitatSensitivity,
    HabitatImpactScore,
    HabitatOverlayResult,
    PermitType,
    BUFFER_DISTANCES,
    PERMIT_TIMELINES,
)


class USFWSService:
    """
    Service for USFWS (US Fish & Wildlife Service) data.

    Integrates with:
    - ECOS (Environmental Conservation Online System)
    - Critical Habitat designations
    - IPaC (Information for Planning and Consultation)
    """

    ECOS_BASE_URL = "https://ecos.fws.gov/ecp/services"
    IPAC_BASE_URL = "https://ipac.ecosphere.fws.gov"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    async def get_species_in_range(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
    ) -> List[Species]:
        """
        Get endangered/threatened species with range overlapping the area.

        Note: In production, this would call the USFWS ECOS/IPaC API.
        This implementation returns simulated data for development.
        """
        # Simulated species data based on general US distribution
        # In production, this would be an actual API call
        species_data = self._get_simulated_species(latitude, longitude)
        return species_data

    async def get_critical_habitats(
        self,
        boundary_geojson: Dict[str, Any],
    ) -> List[CriticalHabitat]:
        """
        Get critical habitat designations overlapping the site boundary.

        Note: In production, this would query USFWS Critical Habitat GIS data.
        """
        # Simulated critical habitat data
        # In production, this would intersect with actual GIS layers
        return self._get_simulated_critical_habitats(boundary_geojson)

    def _get_simulated_species(
        self,
        latitude: float,
        longitude: float,
    ) -> List[Species]:
        """Generate simulated species data for development."""
        species = []

        # Simulated species that might be present based on location
        # This would be replaced with actual API data
        if 25 <= latitude <= 50 and -125 <= longitude <= -65:
            # Continental US - add some common listed species

            # Birds (common across many areas)
            species.append(Species(
                scientific_name="Mycteria americana",
                common_name="Wood Stork",
                status=SpeciesStatus.THREATENED,
                taxonomic_group=TaxonomicGroup.BIRDS,
                critical_habitat=False,
                threats=["Habitat loss", "Water management"],
            ))

            # Desert tortoise in western states
            if longitude < -110:
                species.append(Species(
                    scientific_name="Gopherus agassizii",
                    common_name="Desert Tortoise",
                    status=SpeciesStatus.THREATENED,
                    taxonomic_group=TaxonomicGroup.REPTILES,
                    critical_habitat=True,
                    critical_habitat_area_km2=26000,
                    threats=["Habitat loss", "Disease", "Climate change"],
                ))

            # California-specific species
            if -125 <= longitude <= -114 and 32 <= latitude <= 42:
                species.append(Species(
                    scientific_name="Dipodomys ingens",
                    common_name="Giant Kangaroo Rat",
                    status=SpeciesStatus.ENDANGERED,
                    taxonomic_group=TaxonomicGroup.MAMMALS,
                    critical_habitat=True,
                    critical_habitat_area_km2=120,
                    threats=["Agricultural conversion", "Development"],
                ))

            # Texas/Southwest species
            if -106 <= longitude <= -93 and 25 <= latitude <= 36:
                species.append(Species(
                    scientific_name="Thamnophis eques megalops",
                    common_name="Northern Mexican Gartersnake",
                    status=SpeciesStatus.THREATENED,
                    taxonomic_group=TaxonomicGroup.REPTILES,
                    critical_habitat=True,
                    threats=["Habitat loss", "Non-native species"],
                ))

        return species

    def _get_simulated_critical_habitats(
        self,
        boundary_geojson: Dict[str, Any],
    ) -> List[CriticalHabitat]:
        """Generate simulated critical habitat data for development."""
        # In production, this would perform spatial intersection
        return []


class NWIService:
    """
    Service for National Wetlands Inventory (NWI) data.

    Integrates with USFWS Wetlands Mapper API.
    """

    NWI_BASE_URL = "https://www.fws.gov/wetlands/Data/Mapper-Mapper.html"
    WETLANDS_API = "https://www.fws.gov/wetlands/Data/Web-Map-Services.html"

    def __init__(self):
        pass

    async def get_wetlands_in_boundary(
        self,
        boundary_geojson: Dict[str, Any],
    ) -> List[Wetland]:
        """
        Get wetlands within or intersecting the site boundary.

        Note: In production, this would query NWI WMS/WFS services.
        """
        # Simulated wetland data for development
        return self._get_simulated_wetlands(boundary_geojson)

    def parse_nwi_code(self, code: str) -> Dict[str, Any]:
        """
        Parse NWI classification code into components.

        Example: PEM1Cd = Palustrine Emergent Persistent Seasonally Flooded Partly Drained
        """
        if not code or len(code) < 2:
            return {}

        result = {
            "system": code[0],  # P=Palustrine, L=Lacustrine, R=Riverine, E=Estuarine, M=Marine
            "full_code": code,
        }

        # System mapping
        systems = {
            "P": "Palustrine (Freshwater)",
            "L": "Lacustrine (Lake)",
            "R": "Riverine (River)",
            "E": "Estuarine (Tidal)",
            "M": "Marine (Ocean)",
        }
        result["system_name"] = systems.get(code[0], "Unknown")

        # Subsystem/Class (second character)
        if len(code) >= 2:
            classes = {
                "EM": "Emergent",
                "FO": "Forested",
                "SS": "Scrub-Shrub",
                "UB": "Unconsolidated Bottom",
                "AB": "Aquatic Bed",
                "RS": "Rocky Shore",
                "US": "Unconsolidated Shore",
            }
            for class_code, class_name in classes.items():
                if code[1:3] == class_code or code[1:2] in class_code:
                    result["class"] = class_name
                    break

        # Water regime (typically last letter before modifiers)
        water_regimes = {
            "A": "Temporarily Flooded",
            "B": "Seasonally Saturated",
            "C": "Seasonally Flooded",
            "D": "Continuously Saturated",
            "E": "Seasonally Flooded/Saturated",
            "F": "Semi-permanently Flooded",
            "G": "Intermittently Exposed",
            "H": "Permanently Flooded",
        }
        for char in code[2:]:
            if char in water_regimes:
                result["water_regime"] = water_regimes[char]
                break

        return result

    def _get_simulated_wetlands(
        self,
        boundary_geojson: Dict[str, Any],
    ) -> List[Wetland]:
        """Generate simulated wetland data for development."""
        # Simulate some wetlands for development/testing
        wetlands = []

        # Calculate approximate area from boundary
        # In production, actual intersection would be performed
        coords = boundary_geojson.get("coordinates", [[]])
        if coords and len(coords[0]) > 2:
            # Estimate if area might have wetlands (random simulation)
            # Real implementation would use actual NWI data
            import random
            random.seed(hash(str(coords[0][0])) % 1000)

            if random.random() > 0.4:  # 60% chance of wetlands
                wetlands.append(Wetland(
                    wetland_id=f"NWI-{random.randint(10000, 99999)}",
                    wetland_type=WetlandType.PALUSTRINE_EMERGENT,
                    classification_code="PEM1C",
                    area_m2=random.randint(500, 5000),
                    water_regime="C",
                ))

            if random.random() > 0.7:  # 30% chance of second wetland
                wetlands.append(Wetland(
                    wetland_id=f"NWI-{random.randint(10000, 99999)}",
                    wetland_type=WetlandType.RIVERINE,
                    classification_code="R4SBC",
                    area_m2=random.randint(200, 2000),
                    water_regime="C",
                ))

        return wetlands


class HabitatImpactCalculator:
    """
    Calculator for habitat impact scores.

    Evaluates site compatibility with endangered species and wetland regulations.
    """

    def __init__(self):
        self.usfws = USFWSService()
        self.nwi = NWIService()

    async def analyze_site(
        self,
        site_id: str,
        boundary_geojson: Dict[str, Any],
        centroid: Tuple[float, float],
    ) -> HabitatOverlayResult:
        """
        Perform complete habitat analysis for a site.

        Args:
            site_id: Site identifier
            boundary_geojson: GeoJSON polygon of site boundary
            centroid: (latitude, longitude) of site center

        Returns:
            Complete habitat overlay result
        """
        lat, lng = centroid

        # Gather data
        species = await self.usfws.get_species_in_range(lat, lng)
        critical_habitats = await self.usfws.get_critical_habitats(boundary_geojson)
        wetlands = await self.nwi.get_wetlands_in_boundary(boundary_geojson)

        # Calculate totals
        total_wetland_area = sum(w.area_m2 for w in wetlands)
        wetland_types = list(set(w.wetland_type for w in wetlands))

        # Generate buffer zones
        buffer_zones = self._generate_buffer_zones(wetlands, critical_habitats)

        # Calculate impact score
        impact_score = self._calculate_impact_score(
            site_id=site_id,
            species=species,
            critical_habitats=critical_habitats,
            wetlands=wetlands,
            buffer_zones=buffer_zones,
        )

        return HabitatOverlayResult(
            site_id=site_id,
            analysis_date=datetime.now().isoformat(),
            site_boundary_geojson=boundary_geojson,
            species_in_range=species,
            critical_habitats=critical_habitats,
            wetlands=wetlands,
            total_wetland_area_m2=total_wetland_area,
            wetland_types_present=wetland_types,
            buffer_zones=buffer_zones,
            impact_score=impact_score,
            data_sources=["USFWS ECOS", "National Wetlands Inventory"],
            data_date=datetime.now().strftime("%Y-%m-%d"),
            confidence_level="medium",
        )

    def _generate_buffer_zones(
        self,
        wetlands: List[Wetland],
        critical_habitats: List[CriticalHabitat],
    ) -> List[BufferZone]:
        """Generate buffer zones around sensitive features."""
        zones = []

        # Wetland buffers
        for wetland in wetlands:
            buffer_dist = (
                BUFFER_DISTANCES["wetland_large"]
                if wetland.area_m2 > 5000
                else BUFFER_DISTANCES["wetland_small"]
            )
            zones.append(BufferZone(
                source_type="wetland",
                source_id=wetland.wetland_id,
                buffer_distance_m=buffer_dist,
                restriction_level=HabitatSensitivity.MODERATE,
                notes=f"Buffer for {wetland.type_label}",
            ))

        # Critical habitat buffers
        for ch in critical_habitats:
            zones.append(BufferZone(
                source_type="critical_habitat",
                source_id=ch.unit_id,
                buffer_distance_m=BUFFER_DISTANCES["critical_habitat"],
                restriction_level=HabitatSensitivity.CRITICAL,
                notes=f"Critical habitat for {ch.species_name}",
            ))

        return zones

    def _calculate_impact_score(
        self,
        site_id: str,
        species: List[Species],
        critical_habitats: List[CriticalHabitat],
        wetlands: List[Wetland],
        buffer_zones: List[BufferZone],
    ) -> HabitatImpactScore:
        """Calculate overall habitat impact score."""
        # Count species by status
        endangered_count = len([s for s in species if s.status == SpeciesStatus.ENDANGERED])
        threatened_count = len([s for s in species if s.status == SpeciesStatus.THREATENED])
        species_with_critical = len([s for s in species if s.critical_habitat])

        # Calculate component impacts (0-100, 100 = no impact)
        # Species impact
        if endangered_count > 0:
            species_impact = max(20, 100 - (endangered_count * 30) - (threatened_count * 15))
        elif threatened_count > 0:
            species_impact = max(40, 100 - (threatened_count * 20))
        else:
            species_impact = 100

        # Critical habitat impact
        critical_habitat_area = sum(ch.area_km2 for ch in critical_habitats) * 1000000  # to m2
        if critical_habitat_area > 0 or species_with_critical > 0:
            critical_habitat_impact = max(10, 100 - min(90, species_with_critical * 25))
        else:
            critical_habitat_impact = 100

        # Wetland impact
        total_wetland = sum(w.area_m2 for w in wetlands)
        if total_wetland > 10000:  # > 1 ha
            wetland_impact = 30
        elif total_wetland > 5000:
            wetland_impact = 50
        elif total_wetland > 1000:
            wetland_impact = 70
        elif total_wetland > 0:
            wetland_impact = 85
        else:
            wetland_impact = 100

        # Buffer zone impact
        critical_buffers = len([bz for bz in buffer_zones if bz.restriction_level == HabitatSensitivity.CRITICAL])
        high_buffers = len([bz for bz in buffer_zones if bz.restriction_level == HabitatSensitivity.HIGH])
        if critical_buffers > 0:
            buffer_impact = max(20, 100 - (critical_buffers * 30))
        elif high_buffers > 0:
            buffer_impact = max(50, 100 - (high_buffers * 15))
        else:
            buffer_impact = 100

        # Calculate overall score (weighted average)
        overall = (
            species_impact * 0.35 +
            critical_habitat_impact * 0.25 +
            wetland_impact * 0.25 +
            buffer_impact * 0.15
        )

        # Determine sensitivity level
        if overall < 30:
            sensitivity = HabitatSensitivity.CRITICAL
        elif overall < 50:
            sensitivity = HabitatSensitivity.HIGH
        elif overall < 70:
            sensitivity = HabitatSensitivity.MODERATE
        elif overall < 90:
            sensitivity = HabitatSensitivity.LOW
        else:
            sensitivity = HabitatSensitivity.NONE

        # Determine required permits
        permits = self._determine_permits(
            species, critical_habitats, wetlands, endangered_count, threatened_count
        )
        review_time = sum(PERMIT_TIMELINES.get(p, 0) for p in permits) // max(1, len(permits)) if permits else 0

        return HabitatImpactScore(
            site_id=site_id,
            overall_score=round(overall, 1),
            sensitivity_level=sensitivity,
            species_impact=round(species_impact, 1),
            wetland_impact=round(wetland_impact, 1),
            critical_habitat_impact=round(critical_habitat_impact, 1),
            buffer_zone_impact=round(buffer_impact, 1),
            endangered_species_count=endangered_count,
            threatened_species_count=threatened_count,
            wetland_area_m2=total_wetland,
            critical_habitat_area_m2=critical_habitat_area,
            buffer_zone_overlap_m2=0,  # Would need actual spatial analysis
            permits_required=permits,
            estimated_review_months=review_time,
        )

    def _determine_permits(
        self,
        species: List[Species],
        critical_habitats: List[CriticalHabitat],
        wetlands: List[Wetland],
        endangered_count: int,
        threatened_count: int,
    ) -> List[PermitType]:
        """Determine likely required environmental permits."""
        permits = []

        # ESA Section 7 for federal nexus or listed species
        if endangered_count > 0 or threatened_count > 0:
            permits.append(PermitType.SECTION_7_CONSULTATION)

        # Section 10 if no federal nexus but species present
        if endangered_count > 0 and PermitType.SECTION_7_CONSULTATION not in permits:
            permits.append(PermitType.SECTION_10_PERMIT)

        # Section 404 for wetlands
        if wetlands:
            permits.append(PermitType.SECTION_404_PERMIT)
            # Large wetland impacts may need EIS
            total_wetland = sum(w.area_m2 for w in wetlands)
            if total_wetland > 5000:
                permits.append(PermitType.NEPA_EA)
            if total_wetland > 20000:
                permits.append(PermitType.NEPA_EIS)

        # Migratory bird considerations for most projects
        birds_present = any(s.taxonomic_group == TaxonomicGroup.BIRDS for s in species)
        if birds_present:
            permits.append(PermitType.MIGRATORY_BIRD)

        return permits


async def analyze_habitat(
    site_id: str,
    boundary_geojson: Dict[str, Any],
    latitude: float,
    longitude: float,
) -> HabitatOverlayResult:
    """
    Convenience function for habitat analysis.

    Args:
        site_id: Site identifier
        boundary_geojson: GeoJSON polygon boundary
        latitude: Site centroid latitude
        longitude: Site centroid longitude

    Returns:
        HabitatOverlayResult with complete analysis
    """
    calculator = HabitatImpactCalculator()
    return await calculator.analyze_site(
        site_id=site_id,
        boundary_geojson=boundary_geojson,
        centroid=(latitude, longitude),
    )
