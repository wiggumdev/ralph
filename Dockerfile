# Multi-arch Dockerfile for ralph CLI
# Supports linux/amd64 and linux/arm64

FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash ralph

# Use build arguments for architecture selection
ARG TARGETARCH

# Copy the appropriate binary based on target architecture
COPY packages/cli/dist/ralph-linux-x64/bin/ralph /tmp/ralph-amd64
COPY packages/cli/dist/ralph-linux-arm64/bin/ralph /tmp/ralph-arm64

# Select the correct binary for the target architecture
RUN if [ "$TARGETARCH" = "amd64" ]; then \
      mv /tmp/ralph-amd64 /usr/local/bin/ralph; \
    else \
      mv /tmp/ralph-arm64 /usr/local/bin/ralph; \
    fi && \
    rm -f /tmp/ralph-* && \
    chmod +x /usr/local/bin/ralph

# Switch to non-root user
USER ralph
WORKDIR /home/ralph

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ralph --version || exit 1

ENTRYPOINT ["ralph"]
CMD ["--help"]
