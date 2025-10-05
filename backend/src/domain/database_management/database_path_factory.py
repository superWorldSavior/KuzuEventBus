"""Database Path Factory - Centralized Kuzu database path resolution and operations.

Handles the dual storage model:
1. Filesystem: /tmp/kuzu_data/{tenant_id}/databases/{db_id}/data.kuzu/
2. MinIO archives: {tenant_id}/snapshots/{snapshot_id}.tar.gz

Consolidates path handling logic previously scattered across use cases.
"""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Literal


class DatabasePathFactory:
    """Factory for Kuzu database path operations and validation."""

    @staticmethod
    def resolve_database_path(file_path: str | Path) -> Path:
        """
        Resolve file_path metadata to actual Kuzu DB location.
        
        Args:
            file_path: Path from database metadata (file_path field)
        
        Returns:
            Path object pointing to the Kuzu database
        
        Raises:
            FileNotFoundError: If path doesn't exist
        """
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"Database path does not exist: {file_path}")
        return p

    @staticmethod
    def is_directory_database(path: Path) -> bool:
        """Check if path points to a directory-based Kuzu database."""
        return path.is_dir()

    @staticmethod
    def copy_database_to_archive(
        source_path: Path,
        dest_dir: Path,
        normalize_name: str = "data.kuzu",
    ) -> Path:
        """
        Copy Kuzu database from filesystem to archive staging directory.
        
        Handles both directory-based (data.kuzu/) and legacy file-based formats.
        Normalizes the database name in the archive to 'data.kuzu' for consistency.
        
        Args:
            source_path: Source database path (from metadata file_path)
            dest_dir: Destination directory for archive staging
            normalize_name: Target name in archive (default: "data.kuzu")
        
        Returns:
            Path to the copied database in dest_dir
        
        Example:
            source: /tmp/kuzu_data/tenant-123/databases/db-456/data.kuzu/
            dest_dir: /tmp/archive-staging/db-456/
            result: /tmp/archive-staging/db-456/data.kuzu/
        """
        dest_dir.mkdir(parents=True, exist_ok=True)
        target = dest_dir / normalize_name

        if source_path.is_dir():
            shutil.copytree(str(source_path), str(target))
        else:
            # Legacy single-file format (for tests or old databases)
            shutil.copy2(str(source_path), str(target))
        
        return target

    @staticmethod
    def extract_database_from_archive(
        archive_content_dir: Path,
        dest_path: Path,
        expected_db_name: str = "data.kuzu",
    ) -> Path:
        """
        Extract Kuzu database from archive staging to filesystem.
        
        Args:
            archive_content_dir: Extracted archive root (contains {db_id}/data.kuzu/)
            dest_path: Target filesystem path for the database
            expected_db_name: Expected database directory name in archive
        
        Returns:
            Path to the restored database
        
        Raises:
            FileNotFoundError: If expected database not found in archive
        
        Example:
            archive_content_dir: /tmp/extract/db-456/
            dest_path: /tmp/kuzu_data/tenant-123/databases/db-789/data.kuzu/
            Copies: /tmp/extract/db-456/data.kuzu/ → dest_path
        """
        # Find the database directory in the archive
        db_source = archive_content_dir / expected_db_name
        
        if not db_source.exists():
            raise FileNotFoundError(
                f"Database '{expected_db_name}' not found in archive at {archive_content_dir}"
            )

        # Ensure parent directory exists
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        # Copy database to destination
        if db_source.is_dir():
            # Remove destination if exists (restore overwrites)
            if dest_path.exists():
                shutil.rmtree(str(dest_path))
            shutil.copytree(str(db_source), str(dest_path))
        else:
            # Legacy single-file format
            shutil.copy2(str(db_source), str(dest_path))
        
        return dest_path

    @staticmethod
    def validate_database_structure(path: Path) -> Literal["directory", "file", "invalid"]:
        """
        Validate Kuzu database structure.
        
        Returns:
            "directory" - Modern directory-based format (data.kuzu/)
            "file" - Legacy single-file format (.kuzu)
            "invalid" - Not a valid Kuzu database
        """
        if not path.exists():
            return "invalid"
        
        if path.is_dir():
            # Check for typical Kuzu directory structure markers
            # (Kuzu creates .lock, schema.cypher, etc. inside data.kuzu/)
            return "directory"
        elif path.is_file():
            return "file"
        
        return "invalid"

    @staticmethod
    def get_database_size(path: Path) -> int:
        """
        Calculate total size of Kuzu database in bytes.
        
        Handles both directory and file formats.
        """
        if path.is_dir():
            total = 0
            for item in path.rglob("*"):
                if item.is_file():
                    total += item.stat().st_size
            return total
        elif path.is_file():
            return path.stat().st_size
        return 0
