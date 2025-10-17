use casys::Engine;

#[test]
fn open_engine_and_handles() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let db = engine.open_database("main").expect("open db");
    let br = engine.open_branch(&db, "main").expect("open branch");

    assert!(engine.data_dir().exists());
    let _ = br; // silence unused
}

#[test]
fn invalid_names_are_rejected() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let err = engine.open_database("").unwrap_err();
    assert!(format!("{err}").contains("invalid argument"));

    let db = engine.open_database("ok").unwrap();
    let err = engine.open_branch(&db, "bad name with space").unwrap_err();
    assert!(format!("{err}").contains("invalid argument"));
}
