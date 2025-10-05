use cassis::{Engine, DatabaseName, BranchName};
use cassis::storage::wal;

#[test]
fn wal_write_and_read_records() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let dbn = DatabaseName::try_from("main").unwrap();
    let brn = BranchName::try_from("main").unwrap();

    // Writer with large enough segment to avoid rotation
    let mut w = wal::WalWriter::open(engine.data_dir(), &dbn, &brn, 1024).expect("open wal writer");
    let payloads = vec![b"hello".to_vec(), b"world".to_vec(), b"cassis".to_vec()];
    for p in &payloads { w.write_record(p).expect("write record"); }
    w.flush().expect("flush");

    // Find the last wal file and read it back
    let paths = wal::list_wal_paths(engine.data_dir(), &dbn, &brn).expect("list wal");
    assert!(!paths.is_empty());
    let recs = wal::read_records(paths.last().unwrap()).expect("read records");
    assert_eq!(recs.len(), payloads.len());
    for (a, b) in recs.iter().zip(payloads.iter()) { assert_eq!(a, b); }
}

#[test]
fn wal_rotates_when_max_segment_exceeded() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let dbn = DatabaseName::try_from("main").unwrap();
    let brn = BranchName::try_from("main").unwrap();

    // Small max_segment_bytes to force rotation (5 records of ~9 bytes => rotate multiple times)
    let mut w = wal::WalWriter::open(engine.data_dir(), &dbn, &brn, 12).expect("open wal writer");
    for i in 0..5u8 {
        let payload = vec![i; 8]; // 8 bytes payload; +4 bytes length header = 12 -> rotation boundary
        w.write_record(&payload).expect("write");
    }
    w.flush().expect("flush");

    let paths = wal::list_wal_paths(engine.data_dir(), &dbn, &brn).expect("list wal");
    assert!(paths.len() >= 2, "expected rotation to create multiple wal files");

    // Sum all records across files
    let mut total = 0usize;
    for p in paths {
        let recs = wal::read_records(&p).expect("read");
        total += recs.len();
    }
    assert_eq!(total, 5);
}
