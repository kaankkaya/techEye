#!/usr/bin/env python3
"""TechEye — real device runner. Detects connected iOS/Android device and launches the app."""

import subprocess
import sys
import os
import shutil

MOBILE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mobile")


def run(cmd, cwd=None, capture=True):
    result = subprocess.run(cmd, shell=True, cwd=cwd,
                            capture_output=capture, text=True)
    return result


def check_tool(name):
    if not shutil.which(name):
        print(f"[!] '{name}' bulunamadi. Kur ve tekrar dene.")
        sys.exit(1)


def get_ios_devices():
    r = run("xcrun xctrace list devices 2>/dev/null")
    devices = []
    for line in r.stdout.splitlines():
        # Simulator satirlarini atla
        if "Simulator" in line or "==" in line or not line.strip():
            continue
        # Gercek cihazlar UDID icerior: "iPhone (17.x) (UDID)"
        if "(" in line and line.count("(") >= 2:
            devices.append(line.strip())
    return devices


def get_android_devices():
    r = run("adb devices")
    devices = []
    for line in r.stdout.splitlines():
        if line.endswith("\tdevice"):
            devices.append(line.split("\t")[0].strip())
    return devices


def pick(items, label):
    if not items:
        return None
    if len(items) == 1:
        print(f"[+] {label} bulundu: {items[0]}")
        return items[0]
    print(f"\nBirden fazla {label} bagli:")
    for i, d in enumerate(items):
        print(f"  [{i}] {d}")
    while True:
        try:
            idx = int(input("Kullanmak istedigin cihazin numarasini gir: "))
            return items[idx]
        except (ValueError, IndexError):
            print("    Gecersiz secim, tekrar dene.")


def ensure_deps():
    nm = os.path.join(MOBILE_DIR, "node_modules")
    if not os.path.isdir(nm):
        print("[*] node_modules yok, npm install calistiriliyor...")
        r = run("npm install", cwd=MOBILE_DIR, capture=False)
        if r.returncode != 0:
            print("[!] npm install basarisiz.")
            sys.exit(1)


def get_local_ip():
    """Returns the Mac's WiFi/LAN IP that the physical device can reach."""
    # Try each interface in priority order
    for iface in ("en0", "en1", "en2"):
        r = run(f"ipconfig getifaddr {iface}")
        ip = r.stdout.strip()
        if ip and not ip.startswith("169."):  # skip link-local
            return ip
    # Fallback: route-based detection
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def run_ios(device_line):
    import re
    match = re.search(r'\(([0-9A-Fa-f-]{25,})\)', device_line)
    device_flag = f"--device {match.group(1)}" if match else "--device"

    local_ip = get_local_ip()
    if not local_ip:
        print("[!] Mac'in yerel IP'si tespit edilemedi.")
        print("    iPhone ve Mac'in ayni WiFi aginda oldugundan emin ol.")
        sys.exit(1)

    print(f"\n[*] Mac yerel IP: {local_ip}")
    print(f"[*] iOS cihazinda baslatiliyor: {device_line}")
    cmd = f"npx expo run:ios {device_flag}"
    print(f"    > {cmd}\n")

    env = os.environ.copy()
    env["REACT_NATIVE_PACKAGER_HOSTNAME"] = local_ip
    result = subprocess.run(cmd, shell=True, cwd=MOBILE_DIR, env=env)
    sys.exit(result.returncode)


def run_android(serial):
    print(f"\n[*] Android cihazinda baslatiliyor: {serial}")
    env = os.environ.copy()
    env["ANDROID_SERIAL"] = serial
    cmd = "npx expo run:android --device"
    print(f"    > {cmd}\n")
    result = subprocess.run(cmd, shell=True, cwd=MOBILE_DIR, env=env)
    sys.exit(result.returncode)


def fix_path():
    """Add common Node.js locations to PATH so npx/node work even without shell init."""
    extra = [
        os.path.expanduser("~/.nvm/versions/node/$(ls ~/.nvm/versions/node/ 2>/dev/null | sort -V | tail -1)/bin"),
        "/usr/local/bin",
        "/opt/homebrew/bin",
    ]
    # Resolve nvm active version dynamically
    nvm_dir = os.path.expanduser("~/.nvm/versions/node")
    if os.path.isdir(nvm_dir):
        versions = sorted(os.listdir(nvm_dir))
        if versions:
            extra.insert(0, os.path.join(nvm_dir, versions[-1], "bin"))

    current = os.environ.get("PATH", "")
    os.environ["PATH"] = ":".join(extra) + ":" + current


def main():
    print("=== TechEye — Gercek Cihaz Runner ===\n")

    fix_path()
    check_tool("node")
    check_tool("npm")

    ensure_deps()

    ios_devs = get_ios_devices()
    android_devs = get_android_devices()

    if not ios_devs and not android_devs:
        print("[!] Hicbir gercek cihaz bulunamadi.")
        print("    iOS: iPhone'u USB ile bag ve 'Guvene Al' de.")
        print("    Android: USB debugging'i ac ve 'adb devices' calistigindan emin ol.")
        sys.exit(1)

    # Platform secimi
    platform = None
    if ios_devs and not android_devs:
        platform = "ios"
    elif android_devs and not ios_devs:
        platform = "android"
    else:
        print("Hem iOS hem Android cihaz bagli.")
        choice = input("Platform sec [ios/android]: ").strip().lower()
        platform = choice if choice in ("ios", "android") else "ios"

    if platform == "ios":
        device = pick(ios_devs, "iOS cihaz")
        run_ios(device)
    else:
        device = pick(android_devs, "Android cihaz")
        run_android(device)


if __name__ == "__main__":
    main()
