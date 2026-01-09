# Multi-arch Dockerfile for ralph CLI
# Supports linux/amd64 and linux/arm64

FROM debian:bookworm-slim AS base

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash ralph

# Architecture-specific binary selection
FROM base AS amd64
COPY packages/cli/dist/ralph-linux-x64/bin/ralph /usr/local/bin/ralph

FROM base AS arm64
COPY packages/cli/dist/ralph-linux-arm64/bin/ralph /usr/local/bin/ralph

# Final stage using TARGETARCH
FROM ${TARGETARCH} AS final

# Make binary executable
RUN chmod +x /usr/local/bin/ralph

# Switch to non-root user
USER ralph
WORKDIR /home/ralph

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ralph --version || exit 1

ENTRYPOINT ["ralph"]
CMD ["--help"]
