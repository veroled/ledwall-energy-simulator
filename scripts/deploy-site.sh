#!/usr/bin/env bash
# Esporta il simulatore in statico sotto /simulatore-consumi e lo copia nel repo del sito
# veroledsrl.com (Cloudflare Pages, deploy automatico al push su main).
set -euo pipefail
cd "$(dirname "$0")/.."
SITE="${VEROLED_SITE_DIR:-$HOME/Documents/veroled}"
DEST="$SITE/public/simulatore-consumi"
[ -d "$SITE/public" ] || { echo "Repo del sito non trovato in $SITE (imposta VEROLED_SITE_DIR)"; exit 1; }

echo "▸ build statica con basePath /simulatore-consumi"
npm run prebuild --silent
NEXT_PUBLIC_BASE_PATH=/simulatore-consumi npx next build

echo "▸ copia in $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R out/. "$DEST/"
# file di servizio di Next non necessari online
rm -f "$DEST/next.svg" "$DEST/vercel.svg" "$DEST/file.svg" "$DEST/globe.svg" "$DEST/window.svg"

echo "▸ fatto: $(find "$DEST" -type f | wc -l | tr -d ' ') file, $(du -sh "$DEST" | cut -f1)"
echo "  ora nel repo del sito:  git add public/simulatore-consumi && git commit && git push"
