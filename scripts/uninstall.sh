#!/bin/sh
set -eu

user_home=${HOME:?HOME is not set}
install_dir="$user_home/Library/Application Support/Bro It"
chrome_manifest="$user_home/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.broit.native.json"

case "$install_dir" in
  "$user_home/Library/Application Support/Bro It") ;;
  *) printf '%s\n' "Refusing to remove an unexpected path." >&2; exit 1 ;;
esac

rm -rf -- "$install_dir"
rm -f -- "$chrome_manifest"
printf '%s\n' "Bro It helper removed. Remove the unpacked extension from chrome://extensions to finish."
