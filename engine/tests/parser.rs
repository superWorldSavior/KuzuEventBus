use cassis::exec::parser;
use cassis::exec::ast::*;

#[test]
fn parse_simple_match_return() {
    let query = "MATCH (n:Person) RETURN n";
    let ast = parser::parse(query).expect("parse failed");
    
    assert_eq!(ast.match_clause.patterns.len(), 1);
    assert!(ast.where_clause.is_none());
    assert_eq!(ast.return_clause.items.len(), 1);
    assert!(ast.limit.is_none());
}

#[test]
fn parse_match_with_properties() {
    let query = "MATCH (p:Person {name: 'Alice', age: 30}) RETURN p";
    let ast = parser::parse(query).expect("parse failed");
    
    if let Pattern::Node(node) = &ast.match_clause.patterns[0] {
        assert_eq!(node.labels, vec!["Person"]);
        assert_eq!(node.properties.len(), 2);
        assert_eq!(node.properties.get("name"), Some(&Literal::String("Alice".into())));
        assert_eq!(node.properties.get("age"), Some(&Literal::Int(30)));
    } else {
        panic!("expected node pattern");
    }
}

#[test]
fn parse_with_where_clause() {
    let query = "MATCH (n:User) WHERE n.age > 18 RETURN n";
    let ast = parser::parse(query).expect("parse failed");
    
    assert!(ast.where_clause.is_some());
    let where_clause = ast.where_clause.unwrap();
    
    // Should be a binary op: n.age > 18
    if let Expr::BinaryOp(left, op, right) = where_clause.expr {
        assert_eq!(op, BinOp::Gt);
        if let Expr::Property(var, prop) = *left {
            assert_eq!(var, "n");
            assert_eq!(prop, "age");
        } else {
            panic!("expected property expr");
        }
        if let Expr::Literal(Literal::Int(18)) = *right {
            // ok
        } else {
            panic!("expected int literal");
        }
    } else {
        panic!("expected binary op");
    }
}

#[test]
fn parse_with_limit() {
    let query = "MATCH (n:Book) RETURN n LIMIT 10";
    let ast = parser::parse(query).expect("parse failed");
    
    assert_eq!(ast.limit, Some(10));
}

#[test]
fn parse_complex_where() {
    let query = "MATCH (u:User) WHERE u.age > 18 AND u.active = true RETURN u";
    let ast = parser::parse(query).expect("parse failed");
    
    assert!(ast.where_clause.is_some());
    let where_clause = ast.where_clause.unwrap();
    
    // Should be AND of two comparisons
    if let Expr::BinaryOp(_, op, _) = where_clause.expr {
        assert_eq!(op, BinOp::And);
    } else {
        panic!("expected AND binary op");
    }
}

#[test]
fn parse_return_multiple_columns() {
    let query = "MATCH (n:Person) RETURN n.name, n.age";
    let ast = parser::parse(query).expect("parse failed");
    
    assert_eq!(ast.return_clause.items.len(), 2);
    
    if let Expr::Property(var, prop) = &ast.return_clause.items[0].expr {
        assert_eq!(var, "n");
        assert_eq!(prop, "name");
    } else {
        panic!("expected property in first return item");
    }
    
    if let Expr::Property(var, prop) = &ast.return_clause.items[1].expr {
        assert_eq!(var, "n");
        assert_eq!(prop, "age");
    } else {
        panic!("expected property in second return item");
    }
}

#[test]
fn parse_invalid_query_fails() {
    let query = "INVALID SYNTAX HERE";
    let result = parser::parse(query);
    assert!(result.is_err());
}
