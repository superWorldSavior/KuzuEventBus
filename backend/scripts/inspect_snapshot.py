#!/usr/bin/env python3
import os
import sys
import tarfile
from io import BytesIO

from urllib.parse import urlparse
from minio import Minio


def parse_s3_url(url: str):
    if url.startswith("s3://"):
        parsed = urlparse(url)
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        return bucket, key
    # fallback: assume bucket from env and url is key
    return os.getenv("MINIO_BUCKET", "kuzu-databases"), url


def get_minio_client():
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    secure = os.getenv("MINIO_SECURE", "false").lower() in ("1", "true", "yes")
    return Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)


def main():
    if len(sys.argv) < 2:
        print("Usage: inspect_snapshot.py <s3_url_or_key>")
        sys.exit(2)
    url = sys.argv[1]
    bucket, key = parse_s3_url(url)
    client = get_minio_client()

    # download object to memory
    resp = client.get_object(bucket, key)
    try:
        data = resp.read()
    finally:
        resp.close()
        resp.release_conn()

    # try to open as tar.gz
    try:
        tf = tarfile.open(fileobj=BytesIO(data), mode="r:gz")
    except tarfile.TarError as e:
        print(f"Not a tar.gz: {e}")
        print(f"Object size: {len(data)} bytes")
        sys.exit(1)

    # list members
    members = tf.getmembers()
    print(f"Members count: {len(members)}")
    top = [m for m in members if "/" not in m.name.strip("/")]
    print("Top-level entries:")
    for m in top:
        print(f" - {m.name} {'(dir)' if m.isdir() else '(file)'} size={m.size}")

    # find *.kuzu
    has_kuzu = [m for m in members if m.name.endswith('.kuzu')]
    if has_kuzu:
        print("Found .kuzu files:")
        for m in has_kuzu:
            print(f" - {m.name} size={m.size}")
    else:
        print("No .kuzu files found in archive")

    # infer expected root
    roots = set(m.name.split("/")[0] for m in members)
    print(f"Detected roots: {sorted(roots)}")


if __name__ == "__main__":
    main()
