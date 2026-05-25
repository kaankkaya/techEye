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


def run_ios(device_line):
    # UDID'yi satirdan cikar: son parantez icindeki 40 karakter hex
    import re
    match = re.search(r'\(([0-9A-Fa-f-]{25,})\)', device_line)
    udid_flag = f"--udid {match.group(1)}" if match else "--device"

    print(f"\n[*] iOS cihazinda baslatiliyor: {device_line}")
    cmd = f"npx expo run:ios {udid_flag}"
    print(f"    > {cmd}\n")
    os.execlp("npm", "npm", "run", "--prefix", MOBILE_DIR,
              "--", "ios")  # fallback
    # execlp yerine dogrudan calistir
    subprocess.run(f"cd '{MOBILE_DIR}' && {cmd}", shell=True)


def run_android(serial):
    print(f"\n[*] Android cihazinda baslatiliyor: {serial}")
    env = os.environ.copy()
    env["ANDROID_SERIAL"] = serial
    cmd = "npx expo run:android --device"
    print(f"    > {cmd}\n")
    subprocess.run(cmd, shell=True, cwd=MOBILE_DIR, env=env)


def main():
    print("=== TechEye — Gercek Cihaz Runner ===\n")

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
