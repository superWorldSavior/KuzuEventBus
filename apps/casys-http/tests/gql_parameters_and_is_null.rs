use casys::exec::parser::parse;
use casys::exec::ast::{Expr};

#[test]
fn test_parse_parameter() {
    let query = parse("MATCH (n:Person) WHERE n.age > $minAge RETURN n.name").unwrap();
    
    // Vérifie que le WHERE contient un Parameter
    if let Some(where_clause) = &query.where_clause {
        // On devrait avoir une BinaryOp avec Parameter du côté droit
        if let Expr::BinaryOp(left, _op, right) = &where_clause.expr {
            // left = n.age (Property)
            assert!(matches!(left.as_ref(), Expr::Property(_, _)));
            
            // right = $minAge (Parameter)
            if let Expr::Parameter(param_name) = right.as_ref() {
                assert_eq!(param_name, "minAge");
            } else {
                panic!("Expected Parameter, got: {:?}", right);
            }
        } else {
            panic!("Expected BinaryOp in WHERE");
        }
    } else {
        panic!("Expected WHERE clause");
    }
}

#[test]
fn test_parse_is_null() {
    let query = parse("MATCH (n:Person) WHERE n.email IS NULL RETURN n.name").unwrap();
    
    if let Some(where_clause) = &query.where_clause {
        if let Expr::IsNull(expr) = &where_clause.expr {
            // Devrait être n.email
            assert!(matches!(expr.as_ref(), Expr::Property(_, _)));
        } else {
            panic!("Expected IsNull, got: {:?}", where_clause.expr);
        }
    } else {
        panic!("Expected WHERE clause");
    }
}

#[test]
fn test_parse_is_not_null() {
    let query = parse("MATCH (n:Person) WHERE n.email IS NOT NULL RETURN n.name").unwrap();
    
    if let Some(where_clause) = &query.where_clause {
        if let Expr::IsNotNull(expr) = &where_clause.expr {
            assert!(matches!(expr.as_ref(), Expr::Property(_, _)));
        } else {
            panic!("Expected IsNotNull, got: {:?}", where_clause.expr);
        }
    } else {
        panic!("Expected WHERE clause");
    }
}

#[test]
fn test_parse_parameter_with_is_null() {
    // Requête plus complexe: ($tenantId IS NULL OR n.tenant_id = $tenantId)
    let query = parse(
        "MATCH (n:Person) WHERE $tenantId IS NULL OR n.tenant_id = $tenantId RETURN n.name"
    ).unwrap();
    
    if let Some(where_clause) = &query.where_clause {
        // Devrait être un OR
        if let Expr::BinaryOp(left, _op, right) = &where_clause.expr {
            // left = $tenantId IS NULL
            if let Expr::IsNull(param_expr) = left.as_ref() {
                assert!(matches!(param_expr.as_ref(), Expr::Parameter(_)));
            } else {
                panic!("Expected IsNull on left side");
            }
            
            // right = n.tenant_id = $tenantId
            if let Expr::BinaryOp(prop_expr, _, param_expr2) = right.as_ref() {
                assert!(matches!(prop_expr.as_ref(), Expr::Property(_, _)));
                assert!(matches!(param_expr2.as_ref(), Expr::Parameter(_)));
            } else {
                panic!("Expected BinaryOp on right side");
            }
        } else {
            panic!("Expected OR expression");
        }
    } else {
        panic!("Expected WHERE clause");
    }
}
