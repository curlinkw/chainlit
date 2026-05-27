FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /workspace/chainlit

COPY . /workspace/chainlit

RUN apt-get update -y && \
  apt-get install -y --no-install-recommends wget libpq-dev libatomic1 postgresql postgresql-contrib && \
  rm -rf /var/lib/apt/lists/* && \
  wget -qO- https://deb.nodesource.com/setup_22.x | bash - && \
  apt-get install -y nodejs && \
  npm install -g pnpm

ENV PNPM_HOME="/root/.local/share/pnpm"

ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"

WORKDIR /workspace/chainlit/backend

RUN uv sync --extra tests --extra mypy --extra custom-data --dev && \
  pnpm add -g prisma @prisma/client
