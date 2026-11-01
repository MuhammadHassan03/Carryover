# Test image for Carryover on Linux. Builds the core, the UI and the desktop
# app, then drives the app end to end. Windows-only parts (the real scan) run
# in the Windows CI job instead (.github/workflows/ci.yml).
#
#   docker build -t carryover-test -f docker/Dockerfile .
#   docker run --rm -v "$PWD:/src:ro" -v "$PWD/test-out:/out" carryover-test
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential pkg-config ca-certificates curl file git \
      libwebkit2gtk-4.1-dev librsvg2-dev libayatana-appindicator3-dev libssl-dev \
      xvfb xauth webkit2gtk-driver dbus-x11 fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal -c clippy
ENV PATH=/root/.cargo/bin:$PATH
RUN cargo install tauri-driver --locked
COPY docker/run-tests.sh /usr/local/bin/run-tests
CMD ["run-tests"]
