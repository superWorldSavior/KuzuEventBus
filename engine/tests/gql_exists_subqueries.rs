use casys::exec::parser::parse;
use casys::exec::planner::Planner;
use casys::exec::executor::{Executor, Value};
use casys::index::{InMemoryGraphStore, GraphStore};
use std::collections::HashMap;

#[test]
fn test_parse_exists_simple() {
    let query = parse(
        "MATCH (a:Article) WHERE EXISTS { MATCH (a)-[:HAS_TAG]->(:Tag) RETURN a } RETURN a.title"
    ).unwrap();
    
    // Vérifier que WHERE contient un EXISTS
    assert!(query.where_clause.is_some());
    
    let where_clause = query.where_clause.unwrap();
    // L'expression devrait être EXISTS
    match where_clause.expr {
        casys::exec::ast::Expr::Exists(subquery) => {
            // Vérifier que la sous-requête a un MATCH
            assert!(subquery.match_clause.patterns.len() > 0);
        }
        _ => panic!("Expected EXISTS expression"),
    }
}

#[test]
fn test_exists_with_results() {
    let mut store = InMemoryGraphStore::new();
    
    // Créer des articles et des tags
    let mut article1_props = HashMap::new();
    article1_props.insert("title".to_string(), Value::String("Article1".to_string()));
    let article1 = store.add_node(vec!["Article".to_string()], article1_props).unwrap();
    
    let mut article2_props = HashMap::new();
    article2_props.insert("title".to_string(), Value::String("Article2".to_string()));
    let article2 = store.add_node(vec!["Article".to_string()], article2_props).unwrap();
    
    let mut tag_props = HashMap::new();
    tag_props.insert("name".to_string(), Value::String("Tech".to_string()));
    let tag = store.add_node(vec!["Tag".to_string()], tag_props).unwrap();
    
    // Article1 a un tag, Article2 n'en a pas
    store.add_edge(article1, tag, "HAS_TAG".to_string(), HashMap::new()).unwrap();
    
    // Requête: retourner les articles qui ont au moins un tag
    let query = "MATCH (a:Article) WHERE EXISTS { MATCH (a)-[:HAS_TAG]->(:Tag) RETURN a } RETURN a.title";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    let executor = Executor::new(&store);
    let result = executor.execute(&plan).unwrap();
    
    // Devrait retourner seulement Article1
    assert_eq!(result.rows.len(), 1);
    let title = &result.rows[0][0];
    assert_eq!(title.as_str(), Some("Article1"));
}

#[test]
fn test_exists_no_results() {
    let mut store = InMemoryGraphStore::new();
    
    // Créer un article sans tags
    let mut article_props = HashMap::new();
    article_props.insert("title".to_string(), Value::String("Article1".to_string()));
    store.add_node(vec!["Article".to_string()], article_props).unwrap();
    
    // Requête: retourner les articles qui ont un tag
    let query = "MATCH (a:Article) WHERE EXISTS { MATCH (a)-[:HAS_TAG]->(:Tag) RETURN a } RETURN a.title";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    let executor = Executor::new(&store);
    let result = executor.execute(&plan).unwrap();
    
    // Devrait retourner 0 résultats
    assert_eq!(result.rows.len(), 0);
}

#[test]
fn test_exists_with_not() {
    let mut store = InMemoryGraphStore::new();
    
    let mut article1_props = HashMap::new();
    article1_props.insert("title".to_string(), Value::String("Article1".to_string()));
    let article1 = store.add_node(vec!["Article".to_string()], article1_props).unwrap();
    
    let mut article2_props = HashMap::new();
    article2_props.insert("title".to_string(), Value::String("Article2".to_string()));
    store.add_node(vec!["Article".to_string()], article2_props).unwrap();
    
    let mut tag_props = HashMap::new();
    tag_props.insert("name".to_string(), Value::String("Tech".to_string()));
    let tag = store.add_node(vec!["Tag".to_string()], tag_props).unwrap();
    
    store.add_edge(article1, tag, "HAS_TAG".to_string(), HashMap::new()).unwrap();
    
    // Requête: articles qui N'ont PAS de tag
    let query = "MATCH (a:Article) WHERE NOT EXISTS { MATCH (a)-[:HAS_TAG]->(:Tag) RETURN a } RETURN a.title";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    let executor = Executor::new(&store);
    let result = executor.execute(&plan).unwrap();
    
    // Devrait retourner Article2 (qui n'a pas de tag)
    assert_eq!(result.rows.len(), 1);
    let title = &result.rows[0][0];
    assert_eq!(title.as_str(), Some("Article2"));
}

#[test]
fn test_exists_with_parameter() {
    let mut store = InMemoryGraphStore::new();
    
    let mut article_props = HashMap::new();
    article_props.insert("title".to_string(), Value::String("Article1".to_string()));
    article_props.insert("status".to_string(), Value::String("published".to_string()));
    let article = store.add_node(vec!["Article".to_string()], article_props).unwrap();
    
    let mut tag_props = HashMap::new();
    tag_props.insert("name".to_string(), Value::String("Tech".to_string()));
    let tag = store.add_node(vec!["Tag".to_string()], tag_props).unwrap();
    
    store.add_edge(article, tag, "HAS_TAG".to_string(), HashMap::new()).unwrap();
    
    // Requête avec paramètre dans le WHERE principal et EXISTS
    let query = "MATCH (a:Article) WHERE a.status = $status AND EXISTS { MATCH (a)-[:HAS_TAG]->(:Tag) RETURN a } RETURN a.title";
    let ast = parse(query).unwrap();
    let plan = Planner::plan(&ast).unwrap();
    
    let mut params = HashMap::new();
    params.insert("status".to_string(), Value::String("published".to_string()));
    
    let executor = Executor::with_parameters(&store, params);
    let result = executor.execute(&plan).unwrap();
    
    assert_eq!(result.rows.len(), 1);
    let title = &result.rows[0][0];
    assert_eq!(title.as_str(), Some("Article1"));
}
