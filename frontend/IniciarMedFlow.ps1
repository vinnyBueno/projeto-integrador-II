$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$enderecoMedFlow = 'http://127.0.0.1:8080'
function Testar-MedFlow {
    try {
        $paginaMedFlow = Invoke-WebRequest -Uri "$enderecoMedFlow/index.html" -UseBasicParsing -TimeoutSec 2
        return ($paginaMedFlow.StatusCode -eq 200 -and $paginaMedFlow.Content.Contains('js/login.js'))
    } catch { return $false }
}
try {
    if (-not (Testar-MedFlow)) {
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js nao encontrado. Instale o Node.js e tente novamente.' }
        $executavelMedFlow = $null
        foreach ($candidatoMedFlow in @('py', 'python')) {
            $comandoMedFlow = Get-Command $candidatoMedFlow -ErrorAction SilentlyContinue
            if ($comandoMedFlow) {
                & $comandoMedFlow.Source -c 'import sys; assert sys.version_info.major == 3' 2>$null
                if ($LASTEXITCODE -eq 0) { $executavelMedFlow = $comandoMedFlow.Source; break }
            }
        }
        if (-not $executavelMedFlow) { throw 'Python 3 nao encontrado. Instale o Python 3 e tente novamente.' }
        $logMedFlow = Join-Path $PSScriptRoot 'servidor.log'
        $erroMedFlow = Join-Path $PSScriptRoot 'servidor-erros.log'
        $processoMedFlow = Start-Process -FilePath $executavelMedFlow -ArgumentList @('-u', 'server.py') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $logMedFlow -RedirectStandardError $erroMedFlow -PassThru
        $prontoMedFlow = $false
        for ($tentativaMedFlow = 0; $tentativaMedFlow -lt 20; $tentativaMedFlow++) {
            if (Testar-MedFlow) { $prontoMedFlow = $true; break }
            if ($processoMedFlow.HasExited) { break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $prontoMedFlow) {
            $detalheMedFlow = if (Test-Path -LiteralPath $erroMedFlow) { Get-Content -LiteralPath $erroMedFlow -Raw } else { '' }
            throw "Nao foi possivel iniciar o MedFlow. A porta 8080 pode estar ocupada. $detalheMedFlow"
        }
    }
    Write-Host "MedFlow pronto em $enderecoMedFlow"
    Start-Process $enderecoMedFlow
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host 'Pressione Enter para fechar'
    exit 1
}