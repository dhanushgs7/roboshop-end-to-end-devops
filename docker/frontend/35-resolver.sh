#!/bin/sh
set -eu
nameserver="$(awk '/^nameserver[[:space:]]+/ { print $2; exit }' /etc/resolv.conf)"
if [ -z "$nameserver" ]; then
  echo "No DNS nameserver found in /etc/resolv.conf" >&2
  exit 1
fi
printf 'resolver %s valid=10s ipv6=off;\n' "$nameserver" > /etc/nginx/conf.d/00-resolver.conf
