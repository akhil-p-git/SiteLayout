"""
Optimization module for asset placement.

Provides genetic algorithm-based optimization for solar site layout.
"""

from .models import (
    AssetType,
    AssetDefinition,
    AssetDimensions,
    AssetConstraints,
    PlacedAsset,
    OptimizationConfig,
    OptimizationObjective,
    SiteContext,
    LayoutSolution,
    OptimizationResult,
    DEFAULT_ASSET_DEFINITIONS,
)

from .genetic_optimizer import (
    GeneticOptimizer,
    optimize_layout,
)

__all__ = [
    # Models
    "AssetType",
    "AssetDefinition",
    "AssetDimensions",
    "AssetConstraints",
    "PlacedAsset",
    "OptimizationConfig",
    "OptimizationObjective",
    "SiteContext",
    "LayoutSolution",
    "OptimizationResult",
    "DEFAULT_ASSET_DEFINITIONS",
    # Optimizer
    "GeneticOptimizer",
    "optimize_layout",
]


def validate_constraints() -> None:
    """Validate asset placements against constraints."""
    raise NotImplementedError("Implemented in Node.js constraint service")


def generate_roads() -> None:
    """Generate road network using A* pathfinding."""
    raise NotImplementedError("To be implemented in Task 12")
