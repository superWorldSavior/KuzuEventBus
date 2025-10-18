use casys::{Engine, DatabaseName};
use casys_storage_fs::segments::{self, Segment};

#[test]
fn segment_write_and_read_roundtrip() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let dbn = DatabaseName::try_from("main").unwrap();
    let segment_id = "abc123";
    
    // Create a segment with some fake data
    let data = b"fake_node_data_edge_data".to_vec();
    let seg = Segment::new(10, 5, data.clone());
    
    // Write it
    let path = segments::write_segment(engine.data_dir(), &dbn, segment_id, &seg).expect("write segment");
    assert!(path.exists());

    // Read it back
    let loaded = segments::read_segment(engine.data_dir(), &dbn, segment_id).expect("read segment");
    assert_eq!(loaded.header.node_count, seg.header.node_count);
    assert_eq!(loaded.header.edge_count, seg.header.edge_count);
    assert_eq!(loaded.header.checksum, seg.header.checksum);
    assert_eq!(loaded.data, data);
}

#[test]
fn segment_checksum_validation() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");

    let dbn = DatabaseName::try_from("main").unwrap();
    let segment_id = "corrupted";
    
    let data = b"original_data".to_vec();
    let seg = Segment::new(1, 0, data);
    let path = segments::write_segment(engine.data_dir(), &dbn, segment_id, &seg).expect("write segment");

    // Manually corrupt the data section (overwrite a few bytes)
    use std::fs::OpenOptions;
    use std::io::{Seek, Write};
    let mut f = OpenOptions::new().write(true).open(&path).expect("open for corruption");
    f.seek(std::io::SeekFrom::Start(30)).expect("seek");
    f.write_all(b"XX").expect("corrupt");
    f.sync_all().expect("sync");
    drop(f);

    // Reading should fail with checksum error
    let err = segments::read_segment(engine.data_dir(), &dbn, segment_id).unwrap_err();
    assert!(format!("{err}").contains("checksum mismatch"));
}
