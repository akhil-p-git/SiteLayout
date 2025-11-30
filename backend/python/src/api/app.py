"""
FastAPI Application

Main FastAPI application for geospatial processing services.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import dem_router, optimization_router, roads_router, earthwork_router, reports_router, carbon_router, habitat_router


# Configuration
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown


app = FastAPI(
    title="Site Layouts Geospatial API",
    description="Geospatial processing services for MVP+ Site Layouts",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dem_router, prefix="/api/v1/terrain", tags=["terrain"])
app.include_router(optimization_router, prefix="/api/v1/optimization", tags=["optimization"])
app.include_router(roads_router, prefix="/api/v1/roads", tags=["roads"])
app.include_router(earthwork_router, prefix="/api/v1/earthwork", tags=["earthwork"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(carbon_router, prefix="/api/v1/carbon", tags=["carbon"])
app.include_router(habitat_router, prefix="/api/v1/habitat", tags=["habitat"])


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "site-layouts-geo",
        "version": "1.0.0",
    }


@app.get("/api/v1")
async def api_info() -> dict:
    """API information endpoint."""
    return {
        "name": "Site Layouts Geospatial API",
        "version": "1.0.0",
        "endpoints": {
            "terrain": "/api/v1/terrain",
            "optimization": "/api/v1/optimization",
            "roads": "/api/v1/roads",
            "earthwork": "/api/v1/earthwork",
            "reports": "/api/v1/reports",
            "carbon": "/api/v1/carbon",
            "habitat": "/api/v1/habitat",
        },
    }
