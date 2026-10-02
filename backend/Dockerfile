FROM ghcr.io/astral-sh/uv:0.12.17-python3.13-trixie-slim@sha256:5b7499c3e4048c8f9afcca908c2f2c486923cd441b857976fb6a871e6a090737

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# Install the locked environment before copying sources to preserve Docker's cache.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project

COPY . .

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "fastapi", "dev", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
