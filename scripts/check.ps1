<# Runs project checks in Docker without touching the user's application databases. #>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskProject = Split-Path -Parent $PSScriptRoot

function Invoke-CheckedDocker {
    param([string]$Label, [string[]]$DockerArguments)
    Write-Host "`n$Label"
    & docker @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw "$Label epäonnistui (exit $LASTEXITCODE)." }
}

try {
    # Resolve paths relative to this script, not the caller's working directory.
    Push-Location -LiteralPath $taskProject
    try {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            throw 'Docker ei ole komentopolussa. Asenna tai avaa Docker Desktop.'
        }
        Invoke-CheckedDocker 'Docker-yhteys' @('info', '--format', '{{.ServerVersion}}')
        Invoke-CheckedDocker 'Docker Compose' @('compose', 'version')
        # Locked runtimes stay in containers; no local Node.js, pnpm or Python install.
        Invoke-CheckedDocker 'Kehityskuvien rakennus' @('compose', 'build')
        foreach ($taskCheck in @('test', 'typecheck', 'lint', 'build')) {
            Invoke-CheckedDocker "Frontend: $taskCheck" @('compose', 'run', '--rm', '--no-deps', 'frontend', 'pnpm', $taskCheck)
        }
        # Migration checks use this disposable container's /tmp, never the /data volume.
        # Pytest separately uses its own tmp_path and in-memory databases.
        Invoke-CheckedDocker 'Backend: migraatiot ja testit' @('compose', 'run', '--rm', '--no-deps', '-e', 'MENOMITTARI_DATABASE_URL=sqlite+pysqlite:////tmp/menomittari-check.db', 'backend', 'sh', '-c', 'uv run --no-sync alembic upgrade head && uv run --no-sync alembic check && uv run --no-sync pytest -W error')
        Write-Host "`nKaikki automaattiset tarkistukset onnistuivat. Selainkäyttötesti tehdään erikseen."
    } finally { Pop-Location }
} catch {
    Write-Host "Tarkistus keskeytyi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
exit 0
