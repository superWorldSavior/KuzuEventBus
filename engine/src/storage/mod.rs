//! Stockage: segments immuables, WAL, manifestes, GC.

pub mod manifest;  // lecture/écriture manifest-{ts}.json, PITR
pub mod wal;       // append-only + fsync
pub mod segments;  // format minimal segment (header + data + checksum)
pub mod catalog;   // bases/branches, helpers de chemins

// À implémenter:
// pub mod gc;       // références et collecte
