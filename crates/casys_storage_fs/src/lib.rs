//! Filesystem storage placeholder (segments + WAL), to be implemented.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum FsStorageError {
    #[error("io error: {0}")]
    Io(String),
}

pub struct FsStorage;

impl FsStorage {
    pub fn new() -> Result<Self, FsStorageError> { Ok(Self) }
}
