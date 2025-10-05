# Multi-stage build for small runtime image
FROM rust:1 AS builder
WORKDIR /app

# Create a dummy project layer to cache dependencies
COPY Cargo.toml Cargo.lock* ./
RUN mkdir -p src && echo "fn main() { println!(\"build cache\"); }" > src/main.rs \
    && cargo build --release \
    && rm -rf src

# Now copy real sources and build
COPY src ./src
RUN cargo build --release

# Runtime image
FROM debian:bookworm-slim
ENV ENGINE_PORT=9400
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/kuzu-eventbus-engine /usr/local/bin/engine
EXPOSE 9400
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -sf http://localhost:9400/health || exit 1
CMD ["engine"]
