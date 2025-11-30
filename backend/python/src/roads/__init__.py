"""
Roads Module

A* pathfinding for terrain-aware road network generation.
"""

from .pathfinding import (
    TerrainAwarePathfinder,
    PathfindingConfig,
    PathNode,
    RoadSegment,
    RoadPath,
    RoadNetwork,
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
