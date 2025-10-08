use casys::exec::{parser, planner::Planner, executor::{Executor, Value}};
use casys::index::InMemoryGraphStore;
use casys::index::GraphWriteStore;
use std::collections::HashMap;

#[test]
fn execute_simple_match_return() {
    let mut store = InMemoryGraphStore::new();
    
    // Add test data
    let mut props = HashMap::new();
    props.insert("name".to_string(), Value::String("Alice".to_string()));
    props.insert("age".to_string(), Value::Int(30));
    store.add_node(vec!["Person".to_string()], props).expect("add node");

    // Parse query
    let query = "MATCH (n:Person) RETURN n";
    let ast = parser::parse(query).expect("parse");
    
    // Plan query
    let plan = Planner::plan(&ast).expect("plan");
    
    // Execute query
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    assert_eq!(result.columns.len(), 1);
    assert_eq!(result.rows.len(), 1);
}

#[test]
fn execute_match_with_where_filter() {
    let mut store = InMemoryGraphStore::new();
    
    // Add test data
    let mut props1 = HashMap::new();
    props1.insert("name".to_string(), Value::String("Alice".to_string()));
    props1.insert("age".to_string(), Value::Int(30));
    store.add_node(vec!["Person".to_string()], props1).expect("add node");

    let mut props2 = HashMap::new();
    props2.insert("name".to_string(), Value::String("Bob".to_string()));
    props2.insert("age".to_string(), Value::Int(25));
    store.add_node(vec!["Person".to_string()], props2).expect("add node");

    // Parse and execute query with WHERE filter
    let query = "MATCH (n:Person) WHERE n.age > 28 RETURN n.name";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should only return Alice (age 30 > 28)
    assert_eq!(result.rows.len(), 1);
}

#[test]
fn execute_match_with_limit() {
    let mut store = InMemoryGraphStore::new();
    
    // Add 5 nodes
    for i in 0..5 {
        let mut props = HashMap::new();
        props.insert("id".to_string(), Value::Int(i));
        store.add_node(vec!["Node".to_string()], props).expect("add node");
    }

    // Query with LIMIT 3
    let query = "MATCH (n:Node) RETURN n LIMIT 3";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    assert_eq!(result.rows.len(), 3);
}

#[test]
fn execute_full_scan_without_label() {
    let mut store = InMemoryGraphStore::new();
    
    // Add nodes with different labels
    store.add_node(vec!["Person".to_string()], HashMap::new()).expect("add");
    store.add_node(vec!["Company".to_string()], HashMap::new()).expect("add");
    store.add_node(vec!["Product".to_string()], HashMap::new()).expect("add");

    // Query without label should do full scan
    let query = "MATCH (n) RETURN n";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    assert_eq!(result.rows.len(), 3);
}

#[test]
fn execute_label_scan() {
    let mut store = InMemoryGraphStore::new();
    
    // Add nodes with different labels
    store.add_node(vec!["Person".to_string()], HashMap::new()).expect("add");
    store.add_node(vec!["Person".to_string()], HashMap::new()).expect("add");
    store.add_node(vec!["Company".to_string()], HashMap::new()).expect("add");

    // Query with label should use label index
    let query = "MATCH (n:Person) RETURN n";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should only return Person nodes
    assert_eq!(result.rows.len(), 2);
}

#[test]
fn execute_order_by_ascending() {
    let mut store = InMemoryGraphStore::new();
    
    // Add nodes with different ages
    for age in [30, 20, 40, 25].iter() {
        let mut props = HashMap::new();
        props.insert("age".to_string(), Value::Int(*age));
        store.add_node(vec!["Person".to_string()], props).expect("add node");
    }

    // Query with ORDER BY age ASC
    let query = "MATCH (n:Person) RETURN n.age ORDER BY n.age ASC";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Results should be sorted: 20, 25, 30, 40
    assert_eq!(result.rows.len(), 4);
    assert_eq!(result.rows[0][0], serde_json::Value::Number(20.into()));
    assert_eq!(result.rows[1][0], serde_json::Value::Number(25.into()));
    assert_eq!(result.rows[2][0], serde_json::Value::Number(30.into()));
    assert_eq!(result.rows[3][0], serde_json::Value::Number(40.into()));
}

#[test]
fn execute_order_by_descending() {
    let mut store = InMemoryGraphStore::new();
    
    // Add nodes
    for age in [30, 20, 40].iter() {
        let mut props = HashMap::new();
        props.insert("age".to_string(), Value::Int(*age));
        store.add_node(vec!["Person".to_string()], props).expect("add node");
    }

    // Query with ORDER BY age DESC
    let query = "MATCH (n:Person) RETURN n.age ORDER BY n.age DESC";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Results should be sorted descending: 40, 30, 20
    assert_eq!(result.rows.len(), 3);
    assert_eq!(result.rows[0][0], serde_json::Value::Number(40.into()));
    assert_eq!(result.rows[1][0], serde_json::Value::Number(30.into()));
    assert_eq!(result.rows[2][0], serde_json::Value::Number(20.into()));
}

#[test]
fn execute_edge_pattern_traversal() {
    let mut store = InMemoryGraphStore::new();
    
    // Create nodes
    let mut props1 = HashMap::new();
    props1.insert("name".to_string(), Value::String("Alice".to_string()));
    let alice_id = store.add_node(vec!["Person".to_string()], props1).expect("add alice");

    let mut props2 = HashMap::new();
    props2.insert("name".to_string(), Value::String("Bob".to_string()));
    let bob_id = store.add_node(vec!["Person".to_string()], props2).expect("add bob");

    // Create edge
    let mut edge_props = HashMap::new();
    edge_props.insert("since".to_string(), Value::Int(2020));
    store.add_edge(alice_id, bob_id, "KNOWS".to_string(), edge_props).expect("add edge");

    // Query with edge pattern
    let query = "MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name, b.name";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should return one row with Alice and Bob (order may vary due to HashMap)
    assert_eq!(result.rows.len(), 1);
    let values: Vec<_> = result.rows[0].iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    assert!(values.contains(&"Alice".to_string()));
    assert!(values.contains(&"Bob".to_string()));
}

#[test]
fn execute_count_aggregate() {
    let mut store = InMemoryGraphStore::new();
    
    // Add 5 nodes
    for i in 0..5 {
        let mut props = HashMap::new();
        props.insert("id".to_string(), Value::Int(i));
        store.add_node(vec!["Person".to_string()], props).expect("add node");
    }

    // COUNT aggregate
    let query = "MATCH (n:Person) RETURN COUNT(n)";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    assert_eq!(result.rows.len(), 1);
    assert_eq!(result.rows[0][0], serde_json::Value::Number(5.into()));
}

#[test]
fn execute_sum_avg_min_max_aggregates() {
    let mut store = InMemoryGraphStore::new();
    
    // Add nodes with ages: 20, 30, 40
    for age in [20, 30, 40].iter() {
        let mut props = HashMap::new();
        props.insert("age".to_string(), Value::Int(*age));
        store.add_node(vec!["Person".to_string()], props).expect("add node");
    }

    // Multiple aggregates
    let query = "MATCH (n:Person) RETURN SUM(n.age), AVG(n.age), MIN(n.age), MAX(n.age)";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    assert_eq!(result.rows.len(), 1);
    // Sum = 90.0, Avg = 30.0, Min = 20.0, Max = 40.0
    let row = &result.rows[0];
    assert!(row.iter().any(|v| v.as_f64() == Some(90.0))); // SUM
    assert!(row.iter().any(|v| v.as_f64() == Some(30.0))); // AVG
    assert!(row.iter().any(|v| v.as_f64() == Some(20.0))); // MIN
    assert!(row.iter().any(|v| v.as_f64() == Some(40.0))); // MAX
}

#[test]
fn execute_group_by_with_count() {
    let mut store = InMemoryGraphStore::new();
    
    // Add nodes: 2 in Paris, 3 in London
    for _ in 0..2 {
        let mut props = HashMap::new();
        props.insert("city".to_string(), Value::String("Paris".to_string()));
        store.add_node(vec!["Person".to_string()], props).expect("add node");
    }
    for _ in 0..3 {
        let mut props = HashMap::new();
        props.insert("city".to_string(), Value::String("London".to_string()));
        store.add_node(vec!["Person".to_string()], props).expect("add node");
    }

    // GROUP BY city with COUNT
    let query = "MATCH (n:Person) RETURN n.city, COUNT(n)";
    let ast = parser::parse(query).expect("parse");
    let plan = Planner::plan(&ast).expect("plan");
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).expect("execute");
    
    // Should have 2 groups
    assert_eq!(result.rows.len(), 2);
    
    // One group should have count=2, other count=3
    let counts: Vec<_> = result.rows.iter()
        .filter_map(|row| row.iter().find_map(|v| v.as_i64()))
        .collect();
    assert!(counts.contains(&2));
    assert!(counts.contains(&3));
}
