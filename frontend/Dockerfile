FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

# Keep the package manager version identical in development and verification runs.
RUN corepack enable && corepack install --global pnpm@11.19.0

WORKDIR /app

# Copy dependency manifests first so Docker can reuse the installation layer.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Application sources change more often than dependencies and belong in a later layer.
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]
