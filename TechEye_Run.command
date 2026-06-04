#!/bin/zsh
cd "$(dirname "$0")"
python3 run_device.py
EXIT_CODE=$?

# 0   = başarılı çıkış
# 130 = kullanıcı Ctrl+C ile durdurdu (normal)
if [ $EXIT_CODE -ne 0 ] && [ $EXIT_CODE -ne 130 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Hata olustu (kod: $EXIT_CODE)."
  echo "Kapatmak icin bir tuse basin..."
  read -k1
else
  osascript -e 'tell application "Terminal" to close front window' &
fi
