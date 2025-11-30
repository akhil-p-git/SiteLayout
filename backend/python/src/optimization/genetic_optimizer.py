"""
Genetic Algorithm Optimizer for Asset Placement

Implements a genetic algorithm to optimize asset placement on solar sites,
considering terrain, exclusion zones, and various constraints.
"""

import numpy as np
import uuid
import time
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
from shapely.geometry import Polygon, Point, MultiPolygon
from shapely.ops import unary_union
from shapely.prepared import prep

from .models import (
    AssetType,
    AssetDefinition,
    PlacedAsset,
    OptimizationConfig,
    OptimizationObjective,
    SiteContext,
    LayoutSolution,
    OptimizationResult,
    DEFAULT_ASSET_DEFINITIONS,
)


@dataclass
class Individual:
    """Represents a single solution in the population."""

    genes: np.ndarray  # Encoded asset positions and rotations
    fitness: float = 0.0
    objective_scores: Dict[str, float] = None
    constraint_violations: List[str] = None
    is_valid: bool = False

    def __post_init__(self):
        if self.objective_scores is None:
            self.objective_scores = {}
        if self.constraint_violations is None:
            self.constraint_violations = []


class GeneticOptimizer:
    """
    Genetic algorithm optimizer for asset placement.

    Uses evolution-based search to find optimal asset placements
    that minimize earthwork, cable lengths, and satisfy constraints.
    """

    def __init__(
        self,
        site_context: SiteContext,
        assets_to_place: List[AssetDefinition],
        config: OptimizationConfig = None,
    ):
        self.site = site_context
        self.assets = sorted(assets_to_place, key=lambda a: -a.priority)
        self.config = config or OptimizationConfig()

        # Set random seed for reproducibility
        if self.config.random_seed is not None:
            np.random.seed(self.config.random_seed)

        # Precompute site data
        self._prepare_site_data()

        # Gene encoding: for each asset, encode (x, y, rotation)
        # x, y are normalized [0, 1] within bounding box
        # rotation is normalized [0, 1] representing 0-360 degrees
        self.genes_per_asset = 3
        self.total_assets = sum(a.quantity for a in self.assets)
        self.gene_length = self.total_assets * self.genes_per_asset

        # Expand assets by quantity
        self.expanded_assets: List[Tuple[int, AssetDefinition]] = []
        for asset in self.assets:
            for i in range(asset.quantity):
                self.expanded_assets.append((i, asset))

    def _prepare_site_data(self):
        """Precompute site-related data for optimization."""
        # Get bounding box
        bounds = self.site.boundary.bounds
        self.min_x, self.min_y, self.max_x, self.max_y = bounds
        self.width = self.max_x - self.min_x
        self.height = self.max_y - self.min_y

        # Prepare boundary for fast contains checks
        self.prepared_boundary = prep(self.site.boundary)
        self.prepared_buildable = prep(self.site.buildable_area)

        # Create exclusion zone union for fast intersection checks
        if self.site.exclusion_zones:
            self.exclusion_union = unary_union(self.site.exclusion_zones)
            self.prepared_exclusion = prep(self.exclusion_union)
        else:
            self.exclusion_union = None
            self.prepared_exclusion = None

        # Calculate site centroid (for cable length estimation)
        self.site_centroid = self.site.boundary.centroid

        # Entry point (use first or centroid)
        if self.site.entry_points:
            self.entry_point = self.site.entry_points[0]
        else:
            # Default to centroid of boundary edge closest to center
            self.entry_point = self.site_centroid

    def optimize(self) -> OptimizationResult:
        """Run the genetic algorithm optimization."""
        start_time = time.time()

        # Initialize population
        population = self._initialize_population()

        # Evaluate initial population
        self._evaluate_population(population)

        # Track convergence
        convergence_history = []
        best_fitness = max(ind.fitness for ind in population)
        convergence_history.append(best_fitness)

        stagnation_count = 0
        best_ever = None

        for generation in range(self.config.generations):
            # Selection
            parents = self._select_parents(population)

            # Crossover
            offspring = self._crossover(parents)

            # Mutation
            self._mutate(offspring)

            # Evaluate offspring
            self._evaluate_population(offspring)

            # Elitism - keep best individuals
            population = self._select_survivors(population, offspring)

            # Track best
            current_best = max(population, key=lambda i: i.fitness)
            convergence_history.append(current_best.fitness)

            if best_ever is None or current_best.fitness > best_ever.fitness:
                best_ever = Individual(
                    genes=current_best.genes.copy(),
                    fitness=current_best.fitness,
                    objective_scores=current_best.objective_scores.copy(),
                    constraint_violations=current_best.constraint_violations.copy(),
                    is_valid=current_best.is_valid,
                )
                stagnation_count = 0
            else:
                stagnation_count += 1

            # Check convergence
            if stagnation_count >= self.config.max_stagnation:
                break

            if len(convergence_history) > 10:
                recent = convergence_history[-10:]
                if max(recent) - min(recent) < self.config.convergence_threshold:
                    break

        # Get best solution
        best_solution = self._decode_solution(
            best_ever, generation, (time.time() - start_time) * 1000
        )

        # Generate alternative solutions
        alternatives = self._generate_alternatives(population, generation)

        total_time = (time.time() - start_time) * 1000

        return OptimizationResult(
            best_solution=best_solution,
            alternative_solutions=alternatives,
            convergence_history=convergence_history,
            total_generations=generation + 1,
            total_time_ms=total_time,
            config=self.config,
        )

    def _initialize_population(self) -> List[Individual]:
        """Create initial population with random and heuristic solutions."""
        population = []

        # Create mostly random individuals
        for _ in range(self.config.population_size - 2):
            genes = np.random.random(self.gene_length)
            population.append(Individual(genes=genes))

        # Add a few heuristic-based solutions
        # Center placement heuristic
        center_genes = np.zeros(self.gene_length)
        for i in range(self.total_assets):
            base = i * self.genes_per_asset
            center_genes[base] = 0.5 + np.random.normal(0, 0.1)  # x near center
            center_genes[base + 1] = 0.5 + np.random.normal(0, 0.1)  # y near center
            center_genes[base + 2] = 0.0  # No rotation
        center_genes = np.clip(center_genes, 0, 1)
        population.append(Individual(genes=center_genes))

        # Grid placement heuristic
        grid_genes = self._create_grid_placement()
        population.append(Individual(genes=grid_genes))

        return population

    def _create_grid_placement(self) -> np.ndarray:
        """Create a grid-based initial placement."""
        genes = np.zeros(self.gene_length)
        grid_size = int(np.ceil(np.sqrt(self.total_assets)))

        for i in range(self.total_assets):
            row = i // grid_size
            col = i % grid_size
            base = i * self.genes_per_asset
            genes[base] = (col + 0.5) / grid_size  # x
            genes[base + 1] = (row + 0.5) / grid_size  # y
            genes[base + 2] = 0.0  # rotation

        return genes

    def _evaluate_population(self, population: List[Individual]):
        """Evaluate fitness for all individuals in population."""
        for individual in population:
            self._evaluate_individual(individual)

    def _evaluate_individual(self, individual: Individual):
        """Calculate fitness for a single individual."""
        # Decode genes to asset placements
        placements = self._decode_genes(individual.genes)

        # Check constraints
        violations = self._check_constraints(placements)
        individual.constraint_violations = violations
        individual.is_valid = len([v for v in violations if "ERROR" in v]) == 0

        # Calculate objective scores
        scores = self._calculate_objectives(placements)
        individual.objective_scores = scores

        # Calculate weighted fitness
        if self.config.objective == OptimizationObjective.MIN_EARTHWORK:
            fitness = 1.0 - scores.get("earthwork", 0.5)
        elif self.config.objective == OptimizationObjective.MAX_CAPACITY:
            fitness = scores.get("capacity", 0.5)
        elif self.config.objective == OptimizationObjective.MIN_CABLE_LENGTH:
            fitness = 1.0 - scores.get("cable_length", 0.5)
        else:  # BALANCED
            weights = self.config.objective_weights
            fitness = 0.0
            for key, weight in weights.items():
                score = scores.get(key, 0.5)
                # Invert scores where lower is better
                if key in ["earthwork", "cable_length", "road_length"]:
                    score = 1.0 - score
                fitness += weight * score

        # Penalty for constraint violations
        violation_penalty = len(violations) * 0.1
        fitness = max(0, fitness - violation_penalty)

        # Bonus for valid solutions
        if individual.is_valid:
            fitness += 0.2

        individual.fitness = fitness

    def _decode_genes(self, genes: np.ndarray) -> List[PlacedAsset]:
        """Decode genes into asset placements."""
        placements = []

        for i, (instance_num, asset_def) in enumerate(self.expanded_assets):
            base = i * self.genes_per_asset
            x_norm = genes[base]
            y_norm = genes[base + 1]
            rot_norm = genes[base + 2]

            # Convert normalized to actual coordinates
            x = self.min_x + x_norm * self.width
            y = self.min_y + y_norm * self.height

            # Convert rotation
            if asset_def.dimensions.rotation_allowed:
                rot_step = asset_def.dimensions.rotation_step
                num_steps = int(360 / rot_step)
                rot_index = int(rot_norm * num_steps) % num_steps
                rotation = rot_index * rot_step
            else:
                rotation = 0.0

            placement = PlacedAsset(
                asset_id=f"{asset_def.asset_type.value}_{instance_num}",
                asset_type=asset_def.asset_type,
                definition=asset_def,
                position=(x, y),
                rotation=rotation,
            )
            placements.append(placement)

        return placements

    def _check_constraints(self, placements: List[PlacedAsset]) -> List[str]:
        """Check all constraints for placements."""
        violations = []

        for placement in placements:
            footprint = placement.footprint
            if footprint is None:
                continue

            constraints = placement.definition.constraints

            # Check boundary containment
            if not self.prepared_boundary.contains(footprint):
                if not self.site.boundary.intersects(footprint):
                    violations.append(
                        f"ERROR: {placement.asset_id} is outside site boundary"
                    )
                else:
                    violations.append(
                        f"WARNING: {placement.asset_id} partially outside boundary"
                    )

            # Check setback
            boundary_distance = self.site.boundary.exterior.distance(footprint.centroid)
            if boundary_distance < constraints.min_setback:
                violations.append(
                    f"ERROR: {placement.asset_id} setback {boundary_distance:.1f}m < {constraints.min_setback}m required"
                )

            # Check exclusion zones
            if constraints.avoid_exclusion_zones and self.prepared_exclusion:
                if self.prepared_exclusion.intersects(footprint):
                    violations.append(
                        f"ERROR: {placement.asset_id} overlaps exclusion zone"
                    )

            # Check slope (if slope data available)
            if self.site.slope_data is not None:
                slope = self._get_slope_at_position(placement.position)
                if slope is not None and slope > constraints.max_slope:
                    violations.append(
                        f"WARNING: {placement.asset_id} slope {slope:.1f}° > {constraints.max_slope}° max"
                    )

        # Check inter-asset distances
        for i, p1 in enumerate(placements):
            for j, p2 in enumerate(placements):
                if i >= j:
                    continue

                if p1.footprint is None or p2.footprint is None:
                    continue

                distance = p1.footprint.distance(p2.footprint)

                # Same asset type minimum distance
                if p1.asset_type == p2.asset_type:
                    min_dist = p1.definition.constraints.min_distance_to_same
                    if min_dist > 0 and distance < min_dist:
                        violations.append(
                            f"WARNING: {p1.asset_id} and {p2.asset_id} too close ({distance:.1f}m < {min_dist}m)"
                        )

                # Check for overlap
                if p1.footprint.intersects(p2.footprint):
                    violations.append(
                        f"ERROR: {p1.asset_id} overlaps with {p2.asset_id}"
                    )

        return violations

    def _calculate_objectives(self, placements: List[PlacedAsset]) -> Dict[str, float]:
        """Calculate objective scores (normalized 0-1, lower is better for costs)."""
        scores = {}

        # Earthwork score (based on slope at placement locations)
        earthwork_score = self._calculate_earthwork_score(placements)
        scores["earthwork"] = earthwork_score

        # Cable length score (distance from assets to substation/centroid)
        cable_score = self._calculate_cable_length_score(placements)
        scores["cable_length"] = cable_score

        # Road length score (distance from entry to assets)
        road_score = self._calculate_road_length_score(placements)
        scores["road_length"] = road_score

        # Compactness score (how clustered the assets are)
        compactness = self._calculate_compactness_score(placements)
        scores["compactness"] = compactness

        # Capacity utilization
        capacity = self._calculate_capacity_score(placements)
        scores["capacity"] = capacity

        return scores

    def _calculate_earthwork_score(self, placements: List[PlacedAsset]) -> float:
        """Estimate earthwork based on slopes at placement locations."""
        if self.site.slope_data is None:
            return 0.5  # Neutral if no slope data

        total_slope = 0.0
        count = 0

        for placement in placements:
            slope = self._get_slope_at_position(placement.position)
            if slope is not None:
                total_slope += slope
                count += 1

        if count == 0:
            return 0.5

        avg_slope = total_slope / count
        # Normalize: 0 slope = 0, 15+ degrees = 1
        return min(1.0, avg_slope / 15.0)

    def _calculate_cable_length_score(self, placements: List[PlacedAsset]) -> float:
        """Calculate normalized cable length score."""
        if not placements:
            return 0.5

        # Find substation or use site centroid
        substation = None
        for p in placements:
            if p.asset_type == AssetType.SUBSTATION:
                substation = Point(p.position)
                break

        reference_point = substation or self.site_centroid

        total_distance = sum(
            reference_point.distance(Point(p.position))
            for p in placements
            if p.asset_type != AssetType.SUBSTATION
        )

        # Normalize by site diagonal
        max_distance = np.sqrt(self.width**2 + self.height**2) * len(placements)
        return min(1.0, total_distance / max_distance) if max_distance > 0 else 0.5

    def _calculate_road_length_score(self, placements: List[PlacedAsset]) -> float:
        """Calculate normalized road access score."""
        if not placements:
            return 0.5

        entry = (
            Point(self.entry_point.x, self.entry_point.y)
            if hasattr(self.entry_point, "x")
            else Point(self.entry_point)
        )

        total_distance = sum(
            entry.distance(Point(p.position))
            for p in placements
            if p.definition.constraints.requires_road_access
        )

        max_distance = np.sqrt(self.width**2 + self.height**2) * len(placements)
        return min(1.0, total_distance / max_distance) if max_distance > 0 else 0.5

    def _calculate_compactness_score(self, placements: List[PlacedAsset]) -> float:
        """Calculate how compact/clustered the layout is."""
        if len(placements) < 2:
            return 1.0

        positions = [p.position for p in placements]
        centroid = np.mean(positions, axis=0)

        distances = [np.linalg.norm(np.array(p) - centroid) for p in positions]
        avg_distance = np.mean(distances)

        max_distance = np.sqrt(self.width**2 + self.height**2) / 2
        return 1.0 - min(1.0, avg_distance / max_distance) if max_distance > 0 else 0.5

    def _calculate_capacity_score(self, placements: List[PlacedAsset]) -> float:
        """Calculate capacity utilization score."""
        valid_placements = [
            p
            for p in placements
            if p.footprint and self.prepared_buildable.contains(p.footprint)
        ]
        return len(valid_placements) / len(placements) if placements else 0.0

    def _get_slope_at_position(self, position: Tuple[float, float]) -> Optional[float]:
        """Get slope value at a position from slope raster."""
        if self.site.slope_data is None:
            return None

        x, y = position
        col = int((x - self.min_x) / self.site.grid_resolution)
        row = int((self.max_y - y) / self.site.grid_resolution)

        rows, cols = self.site.slope_data.shape
        if 0 <= row < rows and 0 <= col < cols:
            return float(self.site.slope_data[row, col])
        return None

    def _select_parents(self, population: List[Individual]) -> List[Individual]:
        """Select parents using tournament selection."""
        parents = []
        tournament_size = 3

        for _ in range(len(population)):
            tournament = np.random.choice(population, tournament_size, replace=False)
            winner = max(tournament, key=lambda i: i.fitness)
            parents.append(winner)

        return parents

    def _crossover(self, parents: List[Individual]) -> List[Individual]:
        """Perform crossover to create offspring."""
        offspring = []

        for i in range(0, len(parents) - 1, 2):
            parent1, parent2 = parents[i], parents[i + 1]

            if np.random.random() < self.config.crossover_rate:
                # Two-point crossover
                points = sorted(np.random.choice(self.gene_length, 2, replace=False))
                child1_genes = np.concatenate(
                    [
                        parent1.genes[: points[0]],
                        parent2.genes[points[0] : points[1]],
                        parent1.genes[points[1] :],
                    ]
                )
                child2_genes = np.concatenate(
                    [
                        parent2.genes[: points[0]],
                        parent1.genes[points[0] : points[1]],
                        parent2.genes[points[1] :],
                    ]
                )
            else:
                child1_genes = parent1.genes.copy()
                child2_genes = parent2.genes.copy()

            offspring.append(Individual(genes=child1_genes))
            offspring.append(Individual(genes=child2_genes))

        return offspring

    def _mutate(self, population: List[Individual]):
        """Apply mutation to population."""
        for individual in population:
            for i in range(self.gene_length):
                if np.random.random() < self.config.mutation_rate:
                    # Gaussian mutation
                    individual.genes[i] += np.random.normal(0, 0.1)
                    individual.genes[i] = np.clip(individual.genes[i], 0, 1)

    def _select_survivors(
        self,
        population: List[Individual],
        offspring: List[Individual],
    ) -> List[Individual]:
        """Select survivors for next generation using elitism."""
        combined = population + offspring
        combined.sort(key=lambda i: i.fitness, reverse=True)

        # Keep elite
        survivors = combined[: self.config.elite_size]

        # Fill rest with tournament selection from remaining
        remaining = combined[self.config.elite_size :]
        while len(survivors) < self.config.population_size:
            tournament = np.random.choice(
                remaining, min(3, len(remaining)), replace=False
            )
            winner = max(tournament, key=lambda i: i.fitness)
            survivors.append(winner)

        return survivors[: self.config.population_size]

    def _decode_solution(
        self,
        individual: Individual,
        generation: int,
        computation_time: float,
    ) -> LayoutSolution:
        """Convert an individual to a LayoutSolution."""
        placements = self._decode_genes(individual.genes)

        return LayoutSolution(
            solution_id=str(uuid.uuid4()),
            placed_assets=placements,
            fitness_score=individual.fitness,
            objective_scores=individual.objective_scores,
            constraint_violations=individual.constraint_violations,
            is_valid=individual.is_valid,
            generation=generation,
            computation_time_ms=computation_time,
        )

    def _generate_alternatives(
        self,
        population: List[Individual],
        generation: int,
    ) -> List[LayoutSolution]:
        """Generate alternative layout solutions."""
        # Sort by fitness and get diverse solutions
        sorted_pop = sorted(population, key=lambda i: i.fitness, reverse=True)

        alternatives = []
        seen_patterns = set()

        for individual in sorted_pop[1:]:  # Skip best (already in best_solution)
            if len(alternatives) >= self.config.generate_alternatives:
                break

            # Simple diversity check based on gene pattern
            pattern = tuple(np.round(individual.genes * 10).astype(int))
            if pattern not in seen_patterns:
                seen_patterns.add(pattern)
                solution = self._decode_solution(individual, generation, 0)
                alternatives.append(solution)

        return alternatives


def optimize_layout(
    site_boundary: Dict[str, Any],
    exclusion_zones: List[Dict[str, Any]] = None,
    assets_to_place: List[Dict[str, Any]] = None,
    slope_data: np.ndarray = None,
    config: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Main entry point for layout optimization.

    Args:
        site_boundary: GeoJSON polygon of site boundary
        exclusion_zones: List of GeoJSON polygons for exclusion zones
        assets_to_place: List of asset definitions to place
        slope_data: 2D numpy array of slope values (optional)
        config: Optimization configuration

    Returns:
        Optimization result as dictionary
    """
    from shapely.geometry import shape

    # Convert boundary
    boundary = shape(site_boundary)

    # Convert exclusion zones
    exclusions = []
    if exclusion_zones:
        for zone in exclusion_zones:
            exclusions.append(shape(zone))

    # Create site context
    site_context = SiteContext(
        boundary=boundary,
        exclusion_zones=exclusions,
        slope_data=slope_data,
    )

    # Convert asset definitions or use defaults
    asset_defs = []
    if assets_to_place:
        for asset_dict in assets_to_place:
            asset_type = AssetType(asset_dict.get("type", "bess"))
            if asset_type in DEFAULT_ASSET_DEFINITIONS:
                asset_def = DEFAULT_ASSET_DEFINITIONS[asset_type]
                # Override quantity if specified
                if "quantity" in asset_dict:
                    asset_def = AssetDefinition(
                        asset_type=asset_def.asset_type,
                        name=asset_def.name,
                        dimensions=asset_def.dimensions,
                        constraints=asset_def.constraints,
                        quantity=asset_dict["quantity"],
                        priority=asset_def.priority,
                        required=asset_def.required,
                    )
                asset_defs.append(asset_def)
    else:
        # Use default asset set for a solar site
        asset_defs = [
            DEFAULT_ASSET_DEFINITIONS[AssetType.SUBSTATION],
            DEFAULT_ASSET_DEFINITIONS[AssetType.BESS],
            DEFAULT_ASSET_DEFINITIONS[AssetType.O_AND_M],
            DEFAULT_ASSET_DEFINITIONS[AssetType.PARKING],
        ]

    # Create config
    opt_config = OptimizationConfig()
    if config:
        if "objective" in config:
            opt_config.objective = OptimizationObjective(config["objective"])
        if "population_size" in config:
            opt_config.population_size = config["population_size"]
        if "generations" in config:
            opt_config.generations = config["generations"]
        if "mutation_rate" in config:
            opt_config.mutation_rate = config["mutation_rate"]
        if "generate_alternatives" in config:
            opt_config.generate_alternatives = config["generate_alternatives"]

    # Run optimization
    optimizer = GeneticOptimizer(site_context, asset_defs, opt_config)
    result = optimizer.optimize()

    return result.to_dict()
