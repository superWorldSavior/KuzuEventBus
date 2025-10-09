//! Storage abstraction (placeholder). Real engine uses existing storage for now.

/// Marker trait for storage backends.
pub trait StorageBackend: Send + Sync {}

/// Configurable backend selector (future use).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Backend {
    Mem,
    Fs,
}

impl Default for Backend {
    fn default() -> Self { Backend::Mem }
}
