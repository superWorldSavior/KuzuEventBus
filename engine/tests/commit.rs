use cassis::{Engine, BranchName, DatabaseName};
use cassis::storage::{manifest as mf, wal};

#[test]
fn commit_tx_appends_wal_and_publishes_manifest() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let db = engine.open_database("main").expect("open db");
    engine.create_branch(&db, "main", "feature-c", None).expect("create_branch");
    let br = engine.open_branch(&db, "feature-c").expect("open branch");

    // Before commit, capture latest manifest (exists because create_branch wrote one)
    let dbn = DatabaseName::try_from("main").unwrap();
    let brn = BranchName::try_from("feature-c").unwrap();
    let _before = mf::latest_manifest(engine.data_dir(), &dbn, &brn).expect("latest before");

    // Write a few logical records and commit
    let payloads: Vec<Vec<u8>> = vec![b"r1".to_vec(), b"r2".to_vec(), b"r3".to_vec()];
    let ts = engine.commit_tx(&br, &payloads).expect("commit_tx");

    // A new (or same-ts) manifest must exist and be >= ts
    let after = mf::latest_manifest(engine.data_dir(), &dbn, &brn)
        .expect("latest after").expect("some manifest after");
    assert!(after.version_ts >= ts);

    // WAL files must exist and contain at least our 3 records across segments
    let paths = wal::list_wal_paths(engine.data_dir(), &dbn, &brn).expect("list wal");
    assert!(!paths.is_empty());
    let mut total = 0usize;
    for p in paths {
        let recs = wal::read_records(&p).expect("read records");
        total += recs.len();
    }
    assert!(total >= payloads.len(), "expected at least {} records, got {}", payloads.len(), total);
}
