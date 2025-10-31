Get-NetTCPConnection -LocalPort 5174 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
