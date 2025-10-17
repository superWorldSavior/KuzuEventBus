use casys::exec::parser::parse;
use casys::exec::ast::{Expr};

#[test]
fn test_parse_with_simple() {
    let query = parse(
        "MATCH (n:Person) WITH n.age AS age WHERE age > 25 RETURN age"
    ).unwrap();
    
    // Vérifier que WITH est présent
    assert!(query.with_clause.is_some());
    
    let with_clause = query.with_clause.unwrap();
    assert_eq!(with_clause.items.len(), 1);
    
    // Vérifier l'alias
    assert_eq!(with_clause.items[0].alias, "age");
    
    // Vérifier l'expression
    assert!(matches!(with_clause.items[0].expr, Expr::Property(_, _)));
}

#[test]
fn test_parse_with_multiple_items() {
    let query = parse(
        "MATCH (n:Person) WITH n.age AS age, n.name AS name RETURN age, name"
    ).unwrap();
    
    let with_clause = query.with_clause.unwrap();
    assert_eq!(with_clause.items.len(), 2);
    
    assert_eq!(with_clause.items[0].alias, "age");
    assert_eq!(with_clause.items[1].alias, "name");
}

#[test]
fn test_parse_with_expression() {
    let query = parse(
        "MATCH (n:Person) WITH n.age * 2 AS doubled_age RETURN doubled_age"
    ).unwrap();
    
    let with_clause = query.with_clause.unwrap();
    assert_eq!(with_clause.items.len(), 1);
    assert_eq!(with_clause.items[0].alias, "doubled_age");
    
    // Devrait être une BinaryOp (n.age * 2)
    assert!(matches!(with_clause.items[0].expr, Expr::BinaryOp(_, _, _)));
}

#[test]
fn test_parse_with_parameter() {
    let query = parse(
        "MATCH (n:Person) WITH n.score + $bonus AS total_score WHERE total_score > 100 RETURN total_score"
    ).unwrap();
    
    // Extraire les paramètres d'abord
    let params = query.extract_parameters();
    assert!(params.contains("bonus"));
    
    // Vérifier WITH
    let with_clause = query.with_clause.as_ref().unwrap();
    assert_eq!(with_clause.items[0].alias, "total_score");
}
