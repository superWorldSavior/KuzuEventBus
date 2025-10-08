use casys::{Engine, DatabaseName, BranchName};
use casys::index::InMemoryGraphStore;
use casys::index::GraphWriteStore;
use casys::exec::{parser, planner::Planner, executor::Executor};

#[test]
fn test_variable_length_path_exact_depth() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let mut store = InMemoryGraphStore::new();
    
    // Create graph: Alice -> Bob -> Charlie -> David
    let alice_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Alice".to_string()))].into()).unwrap();
    let bob_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Bob".to_string()))].into()).unwrap();
    let charlie_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Charlie".to_string()))].into()).unwrap();
    let david_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("David".to_string()))].into()).unwrap();
    
    store.add_edge(alice_id, bob_id, "KNOWS".to_string(), Default::default()).unwrap();
    store.add_edge(bob_id, charlie_id, "KNOWS".to_string(), Default::default()).unwrap();
    store.add_edge(charlie_id, david_id, "KNOWS".to_string(), Default::default()).unwrap();
    
    // Query: Friends of friends (2 hops exactly)
    let gql = "MATCH (a:Person)-[:KNOWS*2..2]->(fof:Person) WHERE a.name = 'Alice' RETURN fof.name";
    let ast = parser::parse(gql).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should return Charlie (2 hops from Alice)
    assert_eq!(result.rows.len(), 1);
    assert_eq!(result.rows[0][0], serde_json::Value::String("Charlie".to_string()));
}

#[test]
fn test_variable_length_path_range() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let mut store = InMemoryGraphStore::new();
    
    // Create graph: Alice -> Bob -> Charlie
    let alice_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Alice".to_string()))].into()).unwrap();
    let bob_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Bob".to_string()))].into()).unwrap();
    let charlie_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Charlie".to_string()))].into()).unwrap();
    
    store.add_edge(alice_id, bob_id, "KNOWS".to_string(), Default::default()).unwrap();
    store.add_edge(bob_id, charlie_id, "KNOWS".to_string(), Default::default()).unwrap();
    
    // Query: 1 to 2 hops
    let gql = "MATCH (a:Person)-[:KNOWS*1..2]->(p:Person) WHERE a.name = 'Alice' RETURN p.name";
    let ast = parser::parse(gql).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should return Bob (1 hop) and Charlie (2 hops)
    assert_eq!(result.rows.len(), 2);
    let names: Vec<String> = result.rows.iter()
        .map(|row| row[0].as_str().unwrap().to_string())
        .collect();
    assert!(names.contains(&"Bob".to_string()));
    assert!(names.contains(&"Charlie".to_string()));
}

#[test]
fn test_variable_length_path_shorthand() {
    let dir = tempfile::tempdir().expect("tempdir");
    let engine = Engine::open(dir.path()).expect("engine open");
    let mut store = InMemoryGraphStore::new();
    
    // Create graph: Alice -> Bob -> Charlie
    let alice_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Alice".to_string()))].into()).unwrap();
    let bob_id = store.add_node(vec!["Person".to_string()], 
        [("name".to_string(), casys::exec::executor::Value::String("Bob".to_string()))].into()).unwrap();
    
    store.add_edge(alice_id, bob_id, "KNOWS".to_string(), Default::default()).unwrap();
    
    // Query: *2 means exactly 2 hops (shorthand for *2..2)
    let gql = "MATCH (a:Person)-[:KNOWS*1]->(p:Person) WHERE a.name = 'Alice' RETURN p.name";
    let ast = parser::parse(gql).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should return Bob (1 hop)
    assert_eq!(result.rows.len(), 1);
    assert_eq!(result.rows[0][0], serde_json::Value::String("Bob".to_string()));
}
