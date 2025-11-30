"""
Main Entry Point

Runs the FastAPI geospatial processing service.
"""

import os

import uvicorn


def main() -> None:
    """Run the FastAPI application."""
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() == "true"

    uvicorn.run(
        "src.api.app:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    main()
