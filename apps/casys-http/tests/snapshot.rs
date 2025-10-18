use casys::{Engine, BranchName, DatabaseName};
use casys_storage_fs::manifest as mf;

#[test]
fn snapshot_writes_new_manifest_with_timestamp() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let db = engine.open_database("main").expect("open db");
    engine.create_branch(&db, "main", "feature-z", None).expect("create_branch");

    let br = engine.open_branch(&db, "feature-z").expect("open branch");
    let ts = engine.snapshot(&br, None).expect("snapshot");

    // A manifest with the returned timestamp should exist
    let dbn = DatabaseName::try_from("main").unwrap();
    let brz = BranchName::try_from("feature-z").unwrap();
    let dir_branch = engine
        .data_dir()
        .join(dbn.as_str())
        .join("branches")
        .join(brz.as_str());
    let manifest_path = dir_branch.join(format!("manifest-{}.json", ts));
    assert!(manifest_path.exists(), "expected manifest file at {}", manifest_path.display());

    // latest_manifest should return that version or a later one
    let latest = mf::latest_manifest(engine.data_dir(), &dbn, &brz).expect("latest").expect("some");
    assert!(latest.version_ts >= ts);
}
