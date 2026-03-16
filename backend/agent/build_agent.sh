#!/bin/bash
# ============================================================
# build_agent.sh
# Jalankan di mesin developer untuk build agent.exe
# ============================================================

echo "📦 Building NetWatch Agent..."

# Install dependencies
pip install pyinstaller psutil requests

# Build jadi single .exe (tanpa console window)
pyinstaller \
  --onefile \
  --noconsole \
  --name "netwatch_agent" \
  --icon "icon.ico" \
  netwatch_agent.py

echo "✅ Build selesai: dist/netwatch_agent.exe"
echo "   Ukuran: $(du -sh dist/netwatch_agent.exe | cut -f1)"