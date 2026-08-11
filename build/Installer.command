#!/bin/bash
# Installe CAMPHOTOS et retire le blocage Gatekeeper (« app endommagée »)
set -e
cd "$(dirname "$0")"

if [[ ! -d "CAMPHOTOS.app" ]]; then
  osascript -e 'display dialog "Place ce script à côté de CAMPHOTOS.app (dans le DMG)." buttons {"OK"}'
  exit 1
fi

echo "Retrait des attributs de quarantaine…"
xattr -cr "CAMPHOTOS.app" 2>/dev/null || true

echo "Copie vers Applications…"
rm -rf "/Applications/CAMPHOTOS.app"
cp -R "CAMPHOTOS.app" "/Applications/"
xattr -cr "/Applications/CAMPHOTOS.app" 2>/dev/null || true

echo "Lancement…"
open "/Applications/CAMPHOTOS.app"

osascript -e 'display dialog "CAMPHOTOS est installé dans Applications." buttons {"OK"} default button 1'
