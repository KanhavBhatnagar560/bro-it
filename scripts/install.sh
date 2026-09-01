#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
node_bin=$(command -v node || true)
codex_bin=$(command -v codex || true)
user_home=${HOME:?HOME is not set}
install_dir="$user_home/Library/Application Support/Bro It"
chrome_host_dir="$user_home/Library/Application Support/Google/Chrome/NativeMessagingHosts"
chrome_manifest="$chrome_host_dir/com.broit.native.json"
extension_id="akfkkacfnlciffkfmdpgeofdccoifghc"

if [ "$(uname -s)" != "Darwin" ]; then
  printf '%s\n' "Bro It currently supports macOS only." >&2
  exit 1
fi
if [ -z "$node_bin" ]; then
  printf '%s\n' "Node.js is required. Install Node, then run this again." >&2
  exit 1
fi
if [ -z "$codex_bin" ]; then
  printf '%s\n' "Codex CLI is required. Install it, run codex login, then try again." >&2
  exit 1
fi
if ! "$codex_bin" login status >/dev/null 2>&1; then
  printf '%s\n' "Codex is not logged in. Run 'codex login', then run this installer again." >&2
  exit 1
fi

mkdir -p "$install_dir" "$chrome_host_dir"
sed "1s|.*|#!$node_bin|" "$repo_root/native/host.js" > "$install_dir/host"
chmod 755 "$install_dir/host"

"$node_bin" -e '
  const fs = require("node:fs");
  const codexPath = fs.realpathSync(process.argv[2]);
  const firstLine = fs.readFileSync(codexPath).subarray(0, 160).toString("utf8").split("\n")[0];
  const config = { codexPath };
  if (/^#!.*(?:\/| )node(?:\s|$)/.test(firstLine)) config.nodePath = process.argv[3];
  fs.writeFileSync(process.argv[1], JSON.stringify(config, null, 2) + "\n");
' "$install_dir/config.json" "$codex_bin" "$node_bin"

touch "$install_dir/host.log"

"$node_bin" -e '
  const fs = require("node:fs");
  fs.writeFileSync(process.argv[1], JSON.stringify({
    name: "com.broit.native",
    description: "Local Codex bridge for the Bro It Chrome extension",
    path: process.argv[2],
    type: "stdio",
    allowed_origins: [`chrome-extension://${process.argv[3]}/`]
  }, null, 2) + "\n");
' "$chrome_manifest" "$install_dir/host" "$extension_id"

printf '\nBro It helper installed.\n\n'
printf '1. Open chrome://extensions\n'
printf '2. Turn on Developer mode\n'
printf '3. Click "Load unpacked"\n'
printf '4. Choose: %s\n\n' "$repo_root/extension"
printf 'Then highlight text, right-click, open "Bro It", and choose Explain or Answer.\n'
