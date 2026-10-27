#!/usr/bin/env python3
"""Fill empty proxy groups with fake nodes so mihomo can validate the config."""

import sys
from pathlib import Path

import yaml

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
data = yaml.safe_load(src.read_text(encoding="utf-8"))
data["log-level"] = "debug"

proxies = data.get("proxies") or []
if not proxies:
    data["proxies"] = [
        {
            "name": "fake-node-1",
            "type": "ss",
            "server": "127.0.0.1",
            "port": 8388,
            "cipher": "aes-128-gcm",
            "password": "test",
        },
        {
            "name": "fake-node-2",
            "type": "ss",
            "server": "127.0.0.1",
            "port": 8389,
            "cipher": "aes-128-gcm",
            "password": "test",
        },
    ]

fake_names = [proxy["name"] for proxy in data["proxies"]]
for group in data.get("proxy-groups") or []:
    if not group.get("proxies") and not group.get("use"):
        group["proxies"] = fake_names

dst.write_text(
    yaml.safe_dump(data, allow_unicode=True, default_flow_style=False),
    encoding="utf-8",
)
