from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover
    yaml = None

from src.infrastructure.logging.config import infra_logger


DEFAULT_CONFIG = {
    "retention": {
        "snapshots_archive_days": 90,
        "wal_days": 90,
    },
    "pitr": {
        "create_archive_after_restore": True,
        "delete_replayed_wal": True,
    },
}


@dataclass
class RetentionConfig:
    snapshots_archive_days: int = 90
    wal_days: int = 90


@dataclass
class AppConfig:
    retention: RetentionConfig
    create_archive_after_restore: bool = True
    delete_replayed_wal: bool = True


_config: Optional[AppConfig] = None


def _load_yaml_config(path: str) -> dict:
    if not os.path.exists(path):
        infra_logger.info("Config file not found, using defaults", path=path)
        return DEFAULT_CONFIG
    if yaml is None:
        infra_logger.warning("PyYAML not installed, using defaults")
        return DEFAULT_CONFIG
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f) or {}
            return data
        except Exception as e:  # noqa: BLE001
            infra_logger.warning("Failed to parse YAML config, using defaults", error=str(e))
            return DEFAULT_CONFIG


def settings() -> AppConfig:
    global _config
    if _config is not None:
        return _config
    # Allow overriding path via env var
    cfg_path = os.getenv("APP_CONFIG_PATH", os.path.join(os.path.dirname(__file__), "config.yaml"))
    data = _load_yaml_config(cfg_path)
    cfg = data if isinstance(data, dict) else {}
    retention = cfg.get("retention", {}) if isinstance(cfg, dict) else {}
    pitr = cfg.get("pitr", {}) if isinstance(cfg, dict) else {}
    _config = AppConfig(
        retention=RetentionConfig(
            snapshots_archive_days=int(retention.get("snapshots_archive_days", DEFAULT_CONFIG["retention"]["snapshots_archive_days"])),
            wal_days=int(retention.get("wal_days", DEFAULT_CONFIG["retention"]["wal_days"])),
        ),
        create_archive_after_restore=bool(pitr.get("create_archive_after_restore", DEFAULT_CONFIG["pitr"]["create_archive_after_restore"])),
        delete_replayed_wal=bool(pitr.get("delete_replayed_wal", DEFAULT_CONFIG["pitr"]["delete_replayed_wal"])),
    )
    infra_logger.info(
        "Settings loaded",
        snapshots_archive_days=_config.retention.snapshots_archive_days,
        wal_days=_config.retention.wal_days,
        create_archive_after_restore=_config.create_archive_after_restore,
        delete_replayed_wal=_config.delete_replayed_wal,
    )
    return _config
