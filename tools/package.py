#!/usr/bin/env python3
"""Build buyer-ready zip files for each planner.

    python3 tools/package.py                       # zips go to ./dist
    python3 tools/package.py --contact "Your Shop - you@example.com"
    python3 tools/package.py --only slow-ink-sage --out /some/folder

Each zip unpacks to one friendly folder containing the planner and its
START-HERE.txt. Developer notes (README.md) are left out. The {{CONTACT}}
placeholder in START-HERE.txt is replaced with --contact.
"""
import argparse, os, sys, zipfile

PRODUCTS = {
    "slow-ink-sage": "Slow Ink Sage",
    "life-planner": "Slow Ink Life",
    "aura-planner": "Aura Manifestation Planner",
}
SKIP_FILES = {"README.md", ".DS_Store", "Thumbs.db"}


def build(root, folder, title, out_dir, contact):
    src = os.path.join(root, folder)
    zip_path = os.path.join(out_dir, title.replace(" ", "-") + ".zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, _, files in os.walk(src):
            for name in sorted(files):
                if name in SKIP_FILES:
                    continue
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, src)
                arc = os.path.join(title, rel)
                if name == "START-HERE.txt":
                    text = open(full, encoding="utf-8").read().replace("{{CONTACT}}", contact)
                    z.writestr(arc, text)
                else:
                    z.write(full, arc)
    return zip_path


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="dist", help="folder for the zip files (default: dist)")
    ap.add_argument("--contact", default="[Add your shop name and contact details here]", help="support line for START-HERE.txt")
    ap.add_argument("--only", choices=sorted(PRODUCTS), help="build just one planner")
    args = ap.parse_args()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(args.out, exist_ok=True)
    for folder, title in PRODUCTS.items():
        if args.only and folder != args.only:
            continue
        path = build(root, folder, title, args.out, args.contact)
        print("%-16s %6.0f KB  %s" % (title, os.path.getsize(path) / 1024, path))


if __name__ == "__main__":
    sys.exit(main())
