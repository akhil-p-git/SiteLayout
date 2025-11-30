"""
Roads Module

A* pathfinding for terrain-aware road network generation.
"""

from .pathfinding import (
    PathfindingConfig,
    PathNode,
    RoadNetwork,
    RoadPath,
    RoadSegment,
    TerrainAwarePathfinder,
    generate_road_network,
)

__all__ = [
    "TerrainAwarePathfinder",
    "PathfindingConfig",
    "PathNode",
    "RoadSegment",
    "RoadPath",
    "RoadNetwork",
    "generate_road_network",
]
