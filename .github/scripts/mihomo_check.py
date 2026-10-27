#!/usr/bin/env python3
"""Download one mihomo platform binary, run `mihomo -t -l debug`, keep the log."""

import argparse
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

API = "https://api.github.com/repos/MetaCubeX/mihomo/releases?per_page=30"
UA = "mihomo-check"


def api_get(url, token):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": UA}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def latest_release(token):
    releases = [r for r in api_get(API, token) if not r.get("draft")]
    releases.sort(key=lambda r: r.get("published_at") or "", reverse=True)
    return releases[0]


def pick_asset(release, prefix, archive):
    suffix = "." + archive
    for asset in release.get("assets", []):
        name = asset["name"]
        if not name.startswith(prefix) or not name.endswith(suffix):
            continue
        rest = name[len(prefix):]
        if "compatible" in rest or "go1" in rest:
            continue
        if re.search(r"-v\d+-", name):
            continue
        return asset
    return None


def download(asset, token, dest):
    headers = {"Accept": "application/octet-stream", "User-Agent": UA}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(asset["browser_download_url"], headers=headers)
    with urllib.request.urlopen(req, timeout=180) as resp, open(dest, "wb") as fh:
        shutil.copyfileobj(resp, fh)


def extract(path, archive, outdir):
    if archive == "gz":
        binary = outdir / "mihomo"
        with gzip.open(path, "rb") as src, open(binary, "wb") as dst:
            shutil.copyfileobj(src, dst)
        os.chmod(binary, 0o755)
        return binary
    with zipfile.ZipFile(path) as zf:
        zf.extractall(outdir)
    for name in ("mihomo.exe", "mihomo"):
        for found in outdir.rglob(name):
            return found
    raise SystemExit("mihomo binary not found in archive")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--archive", choices=("gz", "zip"), required=True)
    parser.add_argument("--qemu", default=os.environ.get("MIHOMO_QEMU", ""))
    parser.add_argument("--config", required=True)
    parser.add_argument("--timeout", type=int, default=300)
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN", "")
    release = latest_release(token)
    asset = pick_asset(release, args.prefix, args.archive)
    if not asset:
        print("::error::No asset matching %s in %s" % (args.prefix, release["tag_name"]))
        return 1

    work = Path("mihomo-download")
    if work.exists():
        shutil.rmtree(work)
    work.mkdir()
    archive_path = work / asset["name"]
    download(asset, token, archive_path)
    binary = extract(archive_path, args.archive, work)

    cmd = ([args.qemu] if args.qemu else []) + [
        str(binary), "-t", "-d", ".", "-f", args.config,
    ]
    print("target: %s" % args.target)
    print("release: %s" % release["tag_name"])
    print("asset: %s" % asset["name"])
    print("command: %s" % " ".join(cmd))

    log_path = Path("mihomo-test.log")
    output = ""
    with log_path.open("w", encoding="utf-8") as log:
        log.write("target: %s\nrelease: %s\nasset: %s\ncommand: %s\n\n" % (
            args.target, release["tag_name"], asset["name"], " ".join(cmd)))
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
        )
        try:
            output, _ = proc.communicate(timeout=args.timeout)
            status = proc.returncode
        except subprocess.TimeoutExpired:
            proc.kill()
            output, _ = proc.communicate()
            status = 124
            output = (output or "") + "\n[mihomo-check] killed after %ss\n" % args.timeout
        log.write(output or "")
        print(output or "")

    problems = [line for line in (output or "").splitlines()
                if re.search(r"error|fatal|panic|warning", line, re.I)]
    summary = Path(os.environ.get("GITHUB_STEP_SUMMARY", "job-summary.md"))
    with summary.open("a", encoding="utf-8") as fh:
        fh.write("### %s\n\n" % args.target)
        fh.write("- release: %s\n" % release["tag_name"])
        fh.write("- asset: %s\n" % asset["name"])
        result = "passed" if status == 0 else (
            "timed out after %ss" % args.timeout if status == 124
            else "failed (exit %s)" % status)
        fh.write("- result: %s\n" % result)
        if problems:
            fh.write("- issues:\n")
            for line in problems[:20]:
                fh.write("  - `%s`\n" % line.strip()[:300])
        fh.write("\n")

    if status == 124:
        print("::error::%s timed out after %ss" % (args.target, args.timeout))
    elif status != 0:
        print("::error::%s failed with exit code %s" % (args.target, status))
    return 0 if status == 0 else status


if __name__ == "__main__":
    sys.exit(main())
