use casys::index::{InMemoryGraphStore, persistence::WalRecord};
use casys::index::{GraphReadStore, GraphWriteStore};
use casys::exec::executor::Value;
use casys::types::{DatabaseName, BranchName};
use std::collections::HashMap;

#[test]
fn flush_and_load_nodes() {
    let dir = tempfile::tempdir().expect("tempdir");
    let db = DatabaseName::try_from("testdb").unwrap();
    let branch = BranchName::try_from("main").unwrap();
    
    // Create store with some nodes
    let mut store = InMemoryGraphStore::new();
    let mut props1 = HashMap::new();
    props1.insert("name".to_string(), Value::String("Alice".to_string()));
    props1.insert("age".to_string(), Value::Int(30));
    store.add_node(vec!["Person".to_string()], props1).expect("add node");
    
    let mut props2 = HashMap::new();
    props2.insert("name".to_string(), Value::String("Bob".to_string()));
    props2.insert("age".to_string(), Value::Int(25));
    store.add_node(vec!["Person".to_string()], props2).expect("add node");
    
    // Flush to disk
    store.flush_to_segments(dir.path(), &db, &branch).expect("flush");
    
    // Load from disk into new store
    let loaded = InMemoryGraphStore::load_from_segments(dir.path(), &db, &branch).expect("load");
    
    // Verify loaded data
    let nodes = loaded.scan_by_label("Person").expect("scan");
    assert_eq!(nodes.len(), 2);
    
    // Check properties
    let alice = nodes.iter().find(|n| {
        n.properties.get("name") == Some(&Value::String("Alice".to_string()))
    }).expect("find Alice");
    assert_eq!(alice.properties.get("age"), Some(&Value::Int(30)));
}

#[test]
fn flush_and_load_edges() {
    let dir = tempfile::tempdir().expect("tempdir");
    let db = DatabaseName::try_from("testdb").unwrap();
    let branch = BranchName::try_from("main").unwrap();
    
    // Create store with nodes and edges
    let mut store = InMemoryGraphStore::new();
    let alice_id = store.add_node(vec!["Person".to_string()], HashMap::new()).expect("add node");
    let bob_id = store.add_node(vec!["Person".to_string()], HashMap::new()).expect("add node");
    
    let mut edge_props = HashMap::new();
    edge_props.insert("since".to_string(), Value::Int(2020));
    store.add_edge(alice_id, bob_id, "KNOWS".to_string(), edge_props).expect("add edge");
    
    // Flush and load
    store.flush_to_segments(dir.path(), &db, &branch).expect("flush");
    let loaded = InMemoryGraphStore::load_from_segments(dir.path(), &db, &branch).expect("load");
    
    // Verify edge
    let neighbors = loaded.get_neighbors(alice_id, Some("KNOWS")).expect("neighbors");
    assert_eq!(neighbors.len(), 1);
    assert_eq!(neighbors[0].1.id, bob_id);
    assert_eq!(neighbors[0].0.edge_type, "KNOWS");
}

#[test]
fn wal_record_serialization() {
    let mut props = HashMap::new();
    props.insert("test".to_string(), Value::Int(42));
    
    let record = WalRecord::AddNode {
        id: 1,
        labels: vec!["Test".to_string()],
        properties: props.clone(),
    };
    
    // Serialize and deserialize
    let bytes = record.to_bytes();
    let deserialized = WalRecord::from_bytes(&bytes).expect("deserialize");
    
    // Verify
    match deserialized {
        WalRecord::AddNode { id, labels, properties } => {
            assert_eq!(id, 1);
            assert_eq!(labels, vec!["Test".to_string()]);
            assert_eq!(properties.get("test"), Some(&Value::Int(42)));
        }
        _ => panic!("wrong record type"),
    }
}

#[test]
fn replay_wal_records() {
    let mut store = InMemoryGraphStore::new();
    
    // Create WAL records
    let mut props = HashMap::new();
    props.insert("name".to_string(), Value::String("Charlie".to_string()));
    
    let records = vec![
        WalRecord::AddNode {
            id: 1,
            labels: vec!["Person".to_string()],
            properties: props.clone(),
        },
        WalRecord::AddNode {
            id: 2,
            labels: vec!["Person".to_string()],
            properties: HashMap::new(),
        },
        WalRecord::AddEdge {
            id: 1,
            from_node: 1,
            to_node: 2,
            edge_type: "KNOWS".to_string(),
            properties: HashMap::new(),
        },
    ];
    
    // Replay
    store.replay_wal(&records).expect("replay");
    
    // Verify
    assert_eq!(store.scan_by_label("Person").expect("scan").len(), 2);
    assert_eq!(store.get_neighbors(1, Some("KNOWS")).expect("neighbors").len(), 1);
}

#[test]
fn load_empty_segments() {
    let dir = tempfile::tempdir().expect("tempdir");
    let db = DatabaseName::try_from("testdb").unwrap();
    let branch = BranchName::try_from("main").unwrap();
    
    // Load from non-existent segments (should return empty store)
    let loaded = InMemoryGraphStore::load_from_segments(dir.path(), &db, &branch).expect("load");
    
    assert_eq!(loaded.scan_all().expect("scan").len(), 0);
}
