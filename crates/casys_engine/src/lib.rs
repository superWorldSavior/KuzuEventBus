//! Thin re-export crate for public Casys engine API.
//! This allows future refactors without breaking external crates.

pub mod branch;
pub mod tx;
pub mod storage;
pub mod merge;

pub use casys::{
    Engine,
    DbHandle,
    BranchHandle,
    // Re-export common types from the existing engine crate
    BranchName,
    DatabaseName,
    EngineError,
    GqlQuery,
    QueryResult,
    Timestamp,
};
