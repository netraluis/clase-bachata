#!/usr/bin/env bash
# Falla si en las pantallas hay elementos HTML nativos que tienen componente en shadcn,
# o colores fuera del tema. Excepción documentada: la línea de tiempo del vídeo (player.tsx).
set -e
cd "$(dirname "$0")/.."
bad=0
echo "· elementos nativos con equivalente en shadcn:"
if grep -rnE '<(button|input|textarea|select|table|label|ul|li|kbd|progress|dialog|hr)\b' src/app src/components --include=*.tsx \
   | grep -v 'components/ui/' | grep -v 'timeline-' ; then bad=1; else echo "  ninguno"; fi
echo "· colores fuera del tema:"
if grep -rnE '\b(zinc|amber|red|green|slate|gray|stone|neutral)-[0-9]{2,3}\b|#[0-9a-fA-F]{6}\b' src/app src/components --include=*.tsx \
   | grep -v 'components/ui/' ; then bad=1; else echo "  ninguno"; fi
[ $bad -eq 0 ] && echo "OK: todo usa shadcn" || { echo "FALLO: revisa docs/DESIGN.md"; exit 1; }
