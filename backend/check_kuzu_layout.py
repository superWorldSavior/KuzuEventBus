#!/usr/bin/env python3
"""Script to check if Kuzu creates files or directories."""
import tempfile
from pathlib import Path
import shutil

try:
    import kuzu
except ImportError:
    print("ERROR: kuzu module not installed")
    exit(1)

# Test 1: Create DB at a path ending with .kuzu
print("=" * 60)
print("TEST 1: Creating DB at path ending with '.kuzu'")
print("=" * 60)

with tempfile.TemporaryDirectory() as tmpdir:
    test_path = Path(tmpdir) / "test.kuzu"
    print(f"Path: {test_path}")
    
    # Create the database
    db = kuzu.Database(str(test_path))
    del db  # Close it
    
    # Check what was created
    if test_path.is_file():
        print(f"✅ RESULT: Kuzu created a FILE at {test_path}")
        print(f"   Size: {test_path.stat().st_size} bytes")
    elif test_path.is_dir():
        print(f"✅ RESULT: Kuzu created a DIRECTORY at {test_path}")
        contents = list(test_path.iterdir())
        print(f"   Contents ({len(contents)} items):")
        for item in contents[:10]:  # Show first 10
            print(f"     - {item.name} ({'dir' if item.is_dir() else 'file'})")
    else:
        print(f"❌ RESULT: Path doesn't exist or is neither file nor dir")

print()

# Test 2: Create DB with nested path structure (like provisioning)
print("=" * 60)
print("TEST 2: Creating DB with nested path (tenant/db/data.kuzu)")
print("=" * 60)

with tempfile.TemporaryDirectory() as tmpdir:
    tenant_id = "test-tenant-123"
    db_id = "test-db-456"
    test_path = Path(tmpdir) / tenant_id / db_id / "data.kuzu"
    test_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Path: {test_path}")
    
    # Create the database
    db = kuzu.Database(str(test_path))
    del db
    
    # Check what was created
    if test_path.is_file():
        print(f"✅ RESULT: Kuzu created a FILE at {test_path}")
        print(f"   Size: {test_path.stat().st_size} bytes")
    elif test_path.is_dir():
        print(f"✅ RESULT: Kuzu created a DIRECTORY at {test_path}")
        contents = list(test_path.iterdir())
        print(f"   Contents ({len(contents)} items):")
        for item in contents[:10]:
            print(f"     - {item.name} ({'dir' if item.is_dir() else 'file'})")
    else:
        print(f"❌ RESULT: Path doesn't exist or is neither file nor dir")

print()
print("=" * 60)
print("CONCLUSION:")
print("=" * 60)
print("Based on these tests, we can determine whether to use:")
print("  - shutil.copy2() for file layout")
print("  - shutil.copytree() for directory layout")
