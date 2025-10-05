use cassis::{Engine, DatabaseName, BranchName};
use cassis::storage::{catalog, manifest as mf};
use std::fs;

#[test]
fn list_branches_empty_when_no_branches_exist() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let db = engine.open_database("main").expect("open db");

    // No branches created yet
    let branches = engine.list_branches(&db).expect("list_branches");
    assert!(branches.is_empty());
}

#[test]
fn list_branches_ignores_directories_without_manifests() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let dbn = DatabaseName::try_from("main").unwrap();

    // Create a "noise" directory in branches/ that has no manifest
    let noise_dir = catalog::branches_dir(engine.data_dir(), &dbn).join("invalid-branch");
    fs::create_dir_all(&noise_dir).expect("create noise dir");

    // list_branches should return empty (no valid manifests)
    let branches = catalog::list_branches(engine.data_dir(), &dbn).expect("list_branches");
    assert!(branches.is_empty());
}

#[test]
fn list_branches_returns_branch_with_manifest() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let db = engine.open_database("main").expect("open db");

    // Create a branch with a manifest
    engine.create_branch(&db, "main", "feature-a", None).expect("create_branch");

    // list_branches should now include feature-a
    let branches = engine.list_branches(&db).expect("list_branches");
    assert_eq!(branches.len(), 1);
    assert_eq!(branches[0].as_str(), "feature-a");
}

#[test]
fn list_branches_returns_multiple_sorted() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let db = engine.open_database("main").expect("open db");

    // Create multiple branches
    engine.create_branch(&db, "main", "zeta", None).expect("create zeta");
    engine.create_branch(&db, "main", "alpha", None).expect("create alpha");
    engine.create_branch(&db, "main", "beta", None).expect("create beta");

    // list_branches should return all three, sorted alphabetically
    let branches = engine.list_branches(&db).expect("list_branches");
    assert_eq!(branches.len(), 3);
    assert_eq!(branches[0].as_str(), "alpha");
    assert_eq!(branches[1].as_str(), "beta");
    assert_eq!(branches[2].as_str(), "zeta");
}

#[test]
fn catalog_list_branches_direct_call() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let dbn = DatabaseName::try_from("main").unwrap();
    let brn = BranchName::try_from("test-branch").unwrap();

    // Write a manifest directly
    let manifest = mf::Manifest {
        branch: "test-branch".to_string(),
        version_ts: 1234567890,
        segments: vec![],
        wal_tail: None,
    };
    mf::write_manifest(engine.data_dir(), &dbn, &brn, &manifest).expect("write manifest");

    // Call catalog::list_branches directly
    let branches = catalog::list_branches(engine.data_dir(), &dbn).expect("list_branches");
    assert_eq!(branches.len(), 1);
    assert_eq!(branches[0].as_str(), "test-branch");
}
