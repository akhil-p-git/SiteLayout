FROM python:3.11-slim

# Install GDAL dependencies
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    python3-gdal \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set Python path
ENV PYTHONPATH=/app/src

# Create required directories
RUN mkdir -p /app/uploads /app/output

# Expose port
EXPOSE 8000

# Default command
CMD ["python", "-m", "uvicorn", "src.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
