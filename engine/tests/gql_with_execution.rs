use casys::exec::parser::parse;
use casys::exec::planner::Planner;
use casys::exec::executor::{Executor, Value};
use casys::index::InMemoryGraphStore;
use casys::index::GraphWriteStore;
use std::collections::HashMap;

#[test]
fn test_with_simple_transformation() {
    let mut store = InMemoryGraphStore::new();
    
    // Créer des nœuds
    let mut alice_props = HashMap::new();
    alice_props.insert("name".to_string(), Value::String("Alice".to_string()));
    alice_props.insert("age".to_string(), Value::Int(25));
    store.add_node(vec!["Person".to_string()], alice_props).unwrap();
    
    let mut bob_props = HashMap::new();
    bob_props.insert("name".to_string(), Value::String("Bob".to_string()));
    bob_props.insert("age".to_string(), Value::Int(30));
    store.add_node(vec!["Person".to_string()], bob_props).unwrap();
    
    // Requête WITH simple
    let query = "MATCH (p:Person) WITH p.age AS age WHERE age > 26 RETURN age";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).unwrap();
    
    // Doit retourner seulement Bob (age=30)
    assert_eq!(result.rows.len(), 1);
    let age_val = &result.rows[0][0];
    assert_eq!(age_val.as_i64(), Some(30));
}

#[test]
fn test_with_arithmetic_expression() {
    let mut store = InMemoryGraphStore::new();
    
    let mut item1_props = HashMap::new();
    item1_props.insert("name".to_string(), Value::String("Item1".to_string()));
    item1_props.insert("price".to_string(), Value::Int(10));
    store.add_node(vec!["Product".to_string()], item1_props).unwrap();
    
    let mut item2_props = HashMap::new();
    item2_props.insert("name".to_string(), Value::String("Item2".to_string()));
    item2_props.insert("price".to_string(), Value::Int(20));
    store.add_node(vec!["Product".to_string()], item2_props).unwrap();
    
    // WITH avec expression arithmétique
    let query = "MATCH (p:Product) WITH p.price * 2 AS doubled WHERE doubled > 25 RETURN doubled";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).unwrap();
    
    // Doit retourner seulement Item2 (20*2=40 > 25)
    assert_eq!(result.rows.len(), 1);
    let doubled_val = &result.rows[0][0];
    assert_eq!(doubled_val.as_i64(), Some(40));
}

#[test]
fn test_with_multiple_items() {
    let mut store = InMemoryGraphStore::new();
    
    let mut alice_props = HashMap::new();
    alice_props.insert("name".to_string(), Value::String("Alice".to_string()));
    alice_props.insert("age".to_string(), Value::Int(25));
    store.add_node(vec!["Person".to_string()], alice_props).unwrap();
    
    // WITH avec plusieurs items
    let query = "MATCH (p:Person) WITH p.name AS name, p.age AS age RETURN name, age";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    let executor = Executor::new(&store);
    let result = executor.execute(&plan, None).unwrap();
    
    assert_eq!(result.rows.len(), 1);
    assert_eq!(result.columns.len(), 2);
}

#[test]
fn test_with_parameter() {
    let mut store = InMemoryGraphStore::new();
    
    let mut alice_props = HashMap::new();
    alice_props.insert("name".to_string(), Value::String("Alice".to_string()));
    alice_props.insert("score".to_string(), Value::Int(50));
    store.add_node(vec!["Person".to_string()], alice_props).unwrap();
    
    let mut bob_props = HashMap::new();
    bob_props.insert("name".to_string(), Value::String("Bob".to_string()));
    bob_props.insert("score".to_string(), Value::Int(70));
    store.add_node(vec!["Person".to_string()], bob_props).unwrap();
    
    // WITH avec paramètre
    let query = "MATCH (p:Person) WITH p.score + $bonus AS total WHERE total > 65 RETURN total";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    
    let mut params = std::collections::HashMap::new();
    params.insert("bonus".to_string(), Value::Int(10));
    
    let executor = Executor::with_parameters(&store, params);
    let result = executor.execute(&plan, None).unwrap();
    
    // Alice: 50+10=60 (non), Bob: 70+10=80 (oui)
    assert_eq!(result.rows.len(), 1);
    let total_val = &result.rows[0][0];
    assert_eq!(total_val.as_i64(), Some(80));
}
