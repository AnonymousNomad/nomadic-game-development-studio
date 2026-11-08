$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host 'Source-only tests, not browser/GPU acceptance.'
Push-Location (Join-Path $root 'modules/world-studio')
try { & node --test protocol.test.mjs server.test.mjs mcp.test.mjs; if($LASTEXITCODE -ne 0){throw 'World Studio failed'} } finally { Pop-Location }
Push-Location (Join-Path $root 'modules/liveworld-forge')
try { & node --test tests/scene-contract.test.mjs tests/mcp-stdio.test.mjs; if($LASTEXITCODE -ne 0){throw 'LiveWorld Forge failed'} } finally { Pop-Location }
Push-Location (Join-Path $root 'modules/scene-forge')
try { & py -3 -m unittest discover -s tests -v; if($LASTEXITCODE -ne 0){throw 'Scene Forge failed'} } finally { Pop-Location }
Push-Location (Join-Path $root 'studio')
try { & node --test tests/universal-core.test.mjs; if($LASTEXITCODE -ne 0){throw 'Universal core tests failed'} } finally { Pop-Location }
Push-Location (Join-Path $root 'studio')
try { & node --test tests/presence.test.mjs; if($LASTEXITCODE -ne 0){throw 'Presence fixture tests failed'} } finally { Pop-Location }
Write-Host 'Source and fixture tests complete. No native GPU, vision model or engine integration claims.'
