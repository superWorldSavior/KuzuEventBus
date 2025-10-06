//! AST minimal pour ISO GQL MVP (MATCH/WHERE/RETURN/LIMIT)

use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub struct Query {
    pub match_clause: MatchClause,
    pub where_clause: Option<WhereClause>,
    pub return_clause: ReturnClause,
    pub order_by: Option<OrderByClause>,
    pub limit: Option<u64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MatchClause {
    pub patterns: Vec<Pattern>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Pattern {
    Node(NodePattern),
    Edge(EdgePattern),
}

#[derive(Debug, Clone, PartialEq)]
pub struct NodePattern {
    pub variable: Option<String>,
    pub labels: Vec<String>,
    pub properties: HashMap<String, Literal>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EdgePattern {
    pub variable: Option<String>,
    pub edge_type: Option<String>,
    pub direction: Direction,
    pub properties: HashMap<String, Literal>,
    pub from_node: Box<NodePattern>,
    pub to_node: Box<NodePattern>,
    pub depth: Option<DepthRange>,  // For variable-length paths: *min..max
}

#[derive(Debug, Clone, PartialEq)]
pub struct DepthRange {
    pub min: u32,
    pub max: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Direction {
    Left,     // <-
    Right,    // ->
    Both,     // -
}

#[derive(Debug, Clone, PartialEq)]
pub struct WhereClause {
    pub expr: Expr,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Literal(Literal),
    Ident(String),
    Property(String, String), // variable.property
    BinaryOp(Box<Expr>, BinOp, Box<Expr>),
    UnaryOp(UnOp, Box<Expr>),
    Aggregate(AggFunc, Box<Expr>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum AggFunc {
    Count,
    Sum,
    Avg,
    Min,
    Max,
}

#[derive(Debug, Clone, PartialEq)]
pub enum BinOp {
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
    And,
    Or,
}

#[derive(Debug, Clone, PartialEq)]
pub enum UnOp {
    Not,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Literal {
    String(String),
    Int(i64),
    Float(f64),
    Bool(bool),
    Null,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReturnClause {
    pub items: Vec<ReturnItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReturnItem {
    pub expr: Expr,
    pub alias: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OrderByClause {
    pub items: Vec<OrderByItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OrderByItem {
    pub expr: Expr,
    pub descending: bool,
}
