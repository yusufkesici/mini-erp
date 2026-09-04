#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): yalnızca düzenlenen .ts/.tsx dosyasına odaklı lint
# (+ backend'de format) çalıştırır — tüm projeyi değil, hız için. Asla bloklamaz
# (her zaman 0 ile çıkar); lint bulguları stdout'a yazılır, hook çıktısı olarak görünür.
# jq bu makinede kurulu değil; Node.js proje zaten Node tabanlı olduğu için garanti mevcut.
file="$(node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input?.file_path||"")}catch{}})' 2>/dev/null)"
[ -z "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
normalized="${file//\\//}"

# $root, pwd'den POSIX biçiminde (/c/Users/...) gelir ama $file harness'ten Windows
# sürücü harfi biçiminde (C:/Users/...) gelebilir — prefix karşılaştırması yerine
# yalnızca yol içinde /frontend/ segmentine bakılır (cd hedefleri için $root kullanılır).
if [[ "$normalized" == */frontend/* ]]; then
  ( cd "$root/frontend" && npx oxlint "$file" ) 2>/dev/null || true
else
  ( cd "$root" && npx prettier --write "$file" >/dev/null && npx oxlint "$file" ) 2>/dev/null || true
fi
exit 0
