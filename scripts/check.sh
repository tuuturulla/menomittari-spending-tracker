#!/usr/bin/env bash
# Run project checks in Docker without touching the user's application databases.
set -euo pipefail

# Locate Compose relative to this file, even when called from another directory.
task_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$task_script_dir/.."

run_checked_docker() {
  local label="$1"
  shift
  printf '\n%s\n' "$label"
  # Git Bash must not translate container paths such as /tmp into Windows paths.
  if MSYS_NO_PATHCONV=1 docker "$@"; then
    return 0
  else
    local status=$?
    printf 'Tarkistus keskeytyi: %s epäonnistui (exit %s).\n' "$label" "$status" >&2
    exit 1
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  printf 'Tarkistus keskeytyi: Docker ei ole komentopolussa.\n' >&2
  exit 1
fi

run_checked_docker 'Docker-yhteys' info --format '{{.ServerVersion}}'
run_checked_docker 'Docker Compose' compose version
# Locked runtimes stay in containers; no local Node.js, pnpm or Python install.
run_checked_docker 'Kehityskuvien rakennus' compose build

for task_check in test typecheck lint build; do
  run_checked_docker "Frontend: $task_check" \
    compose run --rm --no-deps frontend pnpm "$task_check"
done

# Migration checks use the disposable container's /tmp, never the /data volume.
# Pytest separately uses its own tmp_path and in-memory databases.
run_checked_docker 'Backend: migraatiot ja testit' \
  compose run --rm --no-deps \
  -e 'MENOMITTARI_DATABASE_URL=sqlite+pysqlite:////tmp/menomittari-check.db' \
  backend sh -c \
  'uv run --no-sync alembic upgrade head && uv run --no-sync alembic check && uv run --no-sync pytest -W error'

printf '\nKaikki automaattiset tarkistukset onnistuivat. Selainkäyttötesti tehdään erikseen.\n'
exit 0
