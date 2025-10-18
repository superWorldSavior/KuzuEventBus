use casys::{Engine, DatabaseName, BranchName};
use casys_storage_fs::manifest as mf;

#[test]
fn create_branch_writes_manifest_and_lists_branch() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let db = engine.open_database("main").expect("open db");

    // Create new branch from main (even if main has no manifest yet)
    engine.create_branch(&db, "main", "feature-x", None).expect("create_branch");

    // A manifest should exist for the new branch
    let br = BranchName::try_from("feature-x").unwrap();
    let paths = mf::list_manifest_paths(engine.data_dir(), db.name(), &br).expect("list manifests");
    assert!(!paths.is_empty(), "expected at least one manifest for new branch");

    // list_branches should include the new branch
    let branches = engine.list_branches(&db).expect("list_branches");
    assert!(branches.iter().any(|b| b.as_str() == "feature-x"));
}

#[test]
fn create_branch_at_pitr_copies_segments() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let db = engine.open_database("main").expect("open db");

    // Prepare a base manifest on branch `main` with one segment
    let base_ts: u64 = 1_700_000_000_000; // some fixed timestamp
    let base_manifest = mf::Manifest {
        branch: "main".to_string(),
        version_ts: base_ts,
        segments: vec![mf::SegmentRef { id: "sha256:deadbeef".into(), range: Some(mf::Range { tx_min: 0, tx_max: 10 }) }],
        wal_tail: Some(mf::WalTail { epoch: 1, seq: 42 }),
    };
    let dbn = DatabaseName::try_from("main").unwrap();
    let br_main = BranchName::try_from("main").unwrap();
    mf::write_manifest(engine.data_dir(), &dbn, &br_main, &base_manifest).expect("write base manifest");

    // Create a new branch from that PITR timestamp
    engine.create_branch(&db, "main", "feature-y", Some(base_ts)).expect("create_branch pitr");

    // Read the created manifest and verify segments/wal_tail copied
    let br_y = BranchName::try_from("feature-y").unwrap();
    let paths = mf::list_manifest_paths(engine.data_dir(), db.name(), &br_y).expect("list manifests new");
    assert!(!paths.is_empty());
    let created = mf::read_manifest(paths.last().unwrap()).expect("read created manifest");

    assert_eq!(created.segments.len(), base_manifest.segments.len());
    assert_eq!(created.wal_tail.as_ref().map(|w| (w.epoch, w.seq)), base_manifest.wal_tail.as_ref().map(|w| (w.epoch, w.seq)));
}
