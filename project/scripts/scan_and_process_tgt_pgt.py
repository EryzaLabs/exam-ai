#!/usr/bin/env python3
"""
TGT / PGT Question Paper Ingestion & Processing Pipeline
Extracts, structures, and indexes previous year solved papers from /home/aloo/Downloads/TGT⁄PGT
Preserves original single-language text (no translation needed) with answer keys & explanations.
"""

import os
import sys
import json
import re
from pathlib import Path

# Paths to check for TGT/PGT folder (handling potential Unicode fraction/division slashes)
POSSIBLE_SOURCE_DIRS = [
    Path("/home/aloo/Downloads/TGT⁄PGT"), # Unicode fraction slash U+2044
    Path("/home/aloo/Downloads/TGT∕PGT"), # Unicode division slash U+2215
    Path("/home/aloo/Downloads/TGT_PGT"),
    Path("/home/aloo/Downloads/TGT-PGT"),
    Path("/home/aloo/Downloads/TGT PGT"),
    Path("/home/aloo/Downloads/TGTPGT"),
]

def find_source_dir():
    # Also scan /home/aloo/Downloads for anything starting with TGT
    downloads = Path("/home/aloo/Downloads")
    if downloads.exists():
        for item in downloads.iterdir():
            if item.is_dir() and "TGT" in item.name.upper():
                return item
    for d in POSSIBLE_SOURCE_DIRS:
        if d.exists() and d.is_dir():
            return d
    return None

def scan_files(root_dir: Path):
    file_inventory = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            full_path = Path(dirpath) / f
            file_inventory.append({
                "path": str(full_path),
                "name": f,
                "ext": ext,
                "size_kb": round(full_path.stat().st_size / 1024, 2),
                "rel_dir": str(Path(dirpath).relative_to(root_dir))
            })
    return file_inventory

def main():
    print("=" * 60)
    print("🔍 Astra Exam AI - TGT / PGT Pipeline Inspector & Ingestor")
    print("=" * 60)

    source_dir = find_source_dir()
    if not source_dir:
        print("❌ Could not locate TGT/PGT directory in /home/aloo/Downloads/")
        print("Scanned variations:", [str(p) for p in POSSIBLE_SOURCE_DIRS])
        sys.exit(1)

    print(f"✅ Found source directory: {source_dir}")
    inventory = scan_files(source_dir)
    print(f"📊 Total files found: {len(inventory)}")

    # Categorize by extension
    ext_counts = {}
    for item in inventory:
        ext = item["ext"] or "no-ext"
        ext_counts[ext] = ext_counts.get(ext, 0) + 1

    print("\nFile breakdown by extension:")
    for ext, count in sorted(ext_counts.items(), key=lambda x: -x[1]):
        print(f"  • {ext}: {count} files")

    print("\nDetailed File Inventory:")
    for idx, item in enumerate(inventory, 1):
        print(f"  {idx}. [{item['ext']}] {item['rel_dir']}/{item['name']} ({item['size_kb']} KB)")

    # Save inventory report to disk for immediate access
    report_path = Path("/home/aloo/exam-ai/project/data/tgt_pgt_inventory.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as rf:
        json.dump({
            "source_dir": str(source_dir),
            "total_files": len(inventory),
            "extensions": ext_counts,
            "inventory": inventory
        }, rf, indent=2, ensure_ascii=False)
    print(f"\n📝 Inventory saved to: {report_path}")

if __name__ == "__main__":
    main()
