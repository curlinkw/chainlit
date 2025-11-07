FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /workspace/chainlit

COPY . /workspace/chainlit

RUN apt-get update -y && \
  apt-get install -y --no-install-recommends wget libpq-dev && \
  rm -rf /var/lib/apt/lists/* && \
  wget -qO- https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs && \
  wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -

ENV PNPM_HOME="/root/.local/share/pnpm"

ENV PATH="/root/.local/bin:$PNPM_HOME:${PATH}"

WORKDIR /workspace/chainlit/backend

RUN uv sync --extra tests --extra mypy --extra dev --extra custom-data && \
  pnpm add -g prisma @prisma/client