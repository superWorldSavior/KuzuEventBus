pub mod types;
pub mod util;
pub mod storage;
pub mod exec;
pub mod index;
pub mod txn;
pub mod gds;
pub mod ann;

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

pub use types::{BranchName, DatabaseName, EngineError, GqlQuery, QueryResult, Timestamp};

/// Engine is the embedded entrypoint. It owns the data directory and shared resources.
pub struct Engine {
    data_dir: PathBuf,
    /// Writer locks per (db, branch) to enforce SW-MR
    writer_locks: Mutex<HashMap<(String, String), Arc<Mutex<()>>>>,
}

/// Opaque handle to a database
#[derive(Debug)]
pub struct DbHandle {
    pub(crate) name: DatabaseName,
}

impl DbHandle {
    pub fn name(&self) -> &DatabaseName {
        &self.name
    }
}

/// Opaque handle to a branch of a database
#[derive(Debug)]
pub struct BranchHandle {
    pub(crate) db: DatabaseName,
    pub(crate) name: BranchName,
}

impl Engine {
    /// Open (or create) an engine using the given data directory.
    pub fn open<P: AsRef<Path>>(data_dir: P) -> Result<Self, EngineError> {
        let dir = data_dir.as_ref();
        std::fs::create_dir_all(dir)
            .map_err(|e| EngineError::StorageIo(format!("create_dir_all({}): {e}", dir.display())))?;
        Ok(Engine { data_dir: dir.to_path_buf(), writer_locks: Mutex::new(HashMap::new()) })
    }

    /// Open a logical database by name (created lazily upon first write).
    pub fn open_database(&self, name: &str) -> Result<DbHandle, EngineError> {
        let db = DatabaseName::try_from(name)?;
        Ok(DbHandle { name: db })
    }

    /// Open a branch within a database (created lazily upon first write).
    pub fn open_branch(&self, db: &DbHandle, branch: &str) -> Result<BranchHandle, EngineError> {
        let br = BranchName::try_from(branch)?;
        Ok(BranchHandle { db: db.name.clone(), name: br })
    }

    fn branch_writer_lock(&self, db: &DatabaseName, br: &BranchName) -> Arc<Mutex<()>> {
        let key = (db.as_str().to_string(), br.as_str().to_string());
        let mut map = self
            .writer_locks
            .lock()
            .expect("writer_locks poisoned");
        map.entry(key)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }

    /// Execute an ISO GQL query against a branch, optionally at a PITR timestamp.
    pub fn execute_gql(
        &self,
        _branch: &BranchHandle,
        _query: &GqlQuery,
        _at: Option<Timestamp>,
    ) -> Result<QueryResult, EngineError> {
        Err(EngineError::NotImplemented("execute_gql".into()))
    }

    /// Create a new branch from an existing one, optionally at a PITR timestamp.
    pub fn create_branch(
        &self,
        db: &DbHandle,
        from: &str,
        new_branch: &str,
        at: Option<Timestamp>,
    ) -> Result<(), EngineError> {
        use crate::storage::manifest as mf;
        // Validate names
        let from_br = BranchName::try_from(from)?;
        let new_br = BranchName::try_from(new_branch)?;
        // Resolve base manifest (latest or PITR)
        let base = match at {
            Some(ts) => mf::pitr_manifest(self.data_dir(), &db.name, &from_br, ts)?,
            None => mf::latest_manifest(self.data_dir(), &db.name, &from_br)?,
        };
        // Build new manifest (copy segments from base if any)
        let now_ms: Timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let manifest = mf::Manifest {
            branch: new_br.as_str().to_string(),
            version_ts: now_ms,
            segments: base.as_ref().map(|m| m.segments.clone()).unwrap_or_default(),
            wal_tail: base.as_ref().and_then(|m| m.wal_tail.clone()),
        };
        // Persist
        let _path = mf::write_manifest(self.data_dir(), &db.name, &new_br, &manifest)?;
        Ok(())
    }

    /// List branches for a database.
    pub fn list_branches(&self, db: &DbHandle) -> Result<Vec<BranchName>, EngineError> {
        use crate::storage::catalog;
        catalog::list_branches(self.data_dir(), &db.name)
    }

    /// Create a snapshot on a branch and return its timestamp.
    pub fn snapshot(&self, branch: &BranchHandle, _label: Option<&str>) -> Result<Timestamp, EngineError> {
        use crate::storage::manifest as mf;
        // Base manifest (latest) for this branch
        let base = mf::latest_manifest(self.data_dir(), &branch.db, &branch.name)?;
        let now_ms: Timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let manifest = mf::Manifest {
            branch: branch.name.as_str().to_string(),
            version_ts: now_ms,
            segments: base.as_ref().map(|m| m.segments.clone()).unwrap_or_default(),
            wal_tail: base.as_ref().and_then(|m| m.wal_tail.clone()),
        };
        let _p = mf::write_manifest(self.data_dir(), &branch.db, &branch.name, &manifest)?;
        Ok(now_ms)
    }

    /// Commit a set of WAL records then publish a new manifest (snapshot). Returns the manifest timestamp.
    pub fn commit_tx(&self, branch: &BranchHandle, records: &[Vec<u8>]) -> Result<Timestamp, EngineError> {
        use crate::storage::wal;
        // Acquire writer lock for SW-MR
        let lock = self.branch_writer_lock(&branch.db, &branch.name);
        let _guard = lock.lock().expect("writer lock poisoned");

        // Append records to WAL (simple length-prefixed format)
        // Default rotation threshold: 4 MiB
        let mut w = wal::WalWriter::open(self.data_dir(), &branch.db, &branch.name, 4 * 1024 * 1024)?;
        for rec in records {
            w.write_record(rec)?;
        }
        w.flush()?;

        // Publish new manifest (snapshot)
        let ts = self.snapshot(branch, None)?;
        Ok(ts)
    }

    /// Merge one branch into another.
    pub fn merge_branch(&self, _db: &DbHandle, _src: &str, _dst: &str) -> Result<(), EngineError> {
        Err(EngineError::NotImplemented("merge_branch".into()))
    }

    /// Return the engine data directory.
    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }
}
