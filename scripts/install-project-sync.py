#!/usr/bin/env python3
"""Mac'te yalnız Kayıt eşitlemesini kurar; token veya agent saklamaz."""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

label = "com.mrbyte.blog-v2.project-sync"
support = Path.home() / "Library/Application Support/blog-v2-project"
support.mkdir(parents=True, exist_ok=True)
source = Path(__file__).with_name("project-sync.py")
target = support / source.name
shutil.copy2(source, target)
gh = shutil.which("gh")
if not gh:
    raise SystemExit("gh bulunamadı")
plist = Path.home() / "Library/LaunchAgents" / (label + ".plist")
plist.parent.mkdir(parents=True, exist_ok=True)
config = {
    "Label": label,
    "ProgramArguments": [sys.executable, str(target)],
    "EnvironmentVariables": {"PATH": str(Path(gh).parent) + ":/usr/bin:/bin"},
    "StartInterval": 120,
    "RunAtLoad": True,
    "StandardOutPath": str(support / "sync.log"),
    "StandardErrorPath": str(support / "errors.log"),
}
domain = f"gui/{os.getuid()}"
subprocess.run(["launchctl", "bootout", domain + "/" + label],
               capture_output=True)
plist.write_bytes(plistlib.dumps(config))
subprocess.run(["launchctl", "bootstrap", domain, str(plist)], check=True)
print("Kayıt eşitlemesi kuruldu: 120 saniye; Mac açık ve kullanıcı oturumu aktifken.")
