use std::time::{SystemTime, UNIX_EPOCH};
use std::path::Path;

use casys_core::{BranchName, DatabaseName, EngineError, StorageBackend, Timestamp};

use crate::{manifest as mf, catalog, wal};

pub struct FsBackend;

impl FsBackend {
    pub fn new() -> Self { Self }
}

impl StorageBackend for FsBackend {
    fn list_branches(&self, root: &Path, db: &DatabaseName) -> Result<Vec<BranchName>, EngineError> {
        catalog::list_branches(root, db)
    }

    fn create_branch(&self, root: &Path, db: &DatabaseName, from: &BranchName, new_branch: &BranchName, at: Option<Timestamp>) -> Result<(), EngineError> {
        let base = match at {
            Some(ts) => mf::pitr_manifest(root, db, from, ts)?,
            None => mf::latest_manifest(root, db, from)?,
        };
        let now_ms: Timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        let manifest = mf::Manifest {
            branch: new_branch.as_str().to_string(),
            version_ts: now_ms,
            segments: base.as_ref().map(|m| m.segments.clone()).unwrap_or_default(),
            wal_tail: base.as_ref().and_then(|m| m.wal_tail.clone()),
        };
        let _ = mf::write_manifest(root, db, new_branch, &manifest)?;
        Ok(())
    }

    fn snapshot(&self, root: &Path, db: &DatabaseName, branch: &BranchName) -> Result<Timestamp, EngineError> {
        let base = mf::latest_manifest(root, db, branch)?;
        let now_ms: Timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        let manifest = mf::Manifest {
            branch: branch.as_str().to_string(),
            version_ts: now_ms,
            segments: base.as_ref().map(|m| m.segments.clone()).unwrap_or_default(),
            wal_tail: base.as_ref().and_then(|m| m.wal_tail.clone()),
        };
        let _ = mf::write_manifest(root, db, branch, &manifest)?;
        Ok(now_ms)
    }

    fn commit_tx(&self, root: &Path, db: &DatabaseName, branch: &BranchName, records: &[Vec<u8>]) -> Result<Timestamp, EngineError> {
        let mut w = wal::WalWriter::open(root, db, branch, 4 * 1024 * 1024)?;
        for rec in records {
            w.write_record(rec)?;
        }
        w.flush()?;
        self.snapshot(root, db, branch)
    }
}
