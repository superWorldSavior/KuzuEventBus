//! Executor: exécute le plan via itérateurs

use super::planner::{ExecutionPlan, PlanNode};
use super::ast::{Expr, BinOp, UnOp, Literal, AggFunc};
use crate::types::{EngineError, QueryResult, ColumnMeta};
use crate::index::{GraphStore, NodeId};
use std::collections::HashMap;

pub type Tuple = HashMap<String, Value>;

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    String(String),
    Int(i64),
    Float(f64),
    Bool(bool),
    Null,
    NodeId(NodeId),
}

impl Value {
    pub fn to_json(&self) -> serde_json::Value {
        match self {
            Value::String(s) => serde_json::Value::String(s.clone()),
            Value::Int(i) => serde_json::Value::Number((*i).into()),
            Value::Float(f) => serde_json::Number::from_f64(*f)
                .map(serde_json::Value::Number)
                .unwrap_or(serde_json::Value::Null),
            Value::Bool(b) => serde_json::Value::Bool(*b),
            Value::Null => serde_json::Value::Null,
            Value::NodeId(id) => serde_json::Value::Number((*id).into()),
        }
    }

    pub fn from_json(v: &serde_json::Value) -> Option<Value> {
        match v {
            serde_json::Value::String(s) => Some(Value::String(s.clone())),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() { Some(Value::Int(i)) }
                else if let Some(f) = n.as_f64() { Some(Value::Float(f)) }
                else { None }
            }
            serde_json::Value::Bool(b) => Some(Value::Bool(*b)),
            serde_json::Value::Null => Some(Value::Null),
            _ => None,
        }
    }
}

pub struct Executor<'a> {
    store: &'a dyn GraphStore,
}

impl<'a> Executor<'a> {
    pub fn new(store: &'a dyn GraphStore) -> Self {
        Self { store }
    }

    pub fn execute(&self, plan: &ExecutionPlan) -> Result<QueryResult, EngineError> {
        let tuples = self.execute_node(&plan.root)?;
        
        // Convert tuples to QueryResult format
        let mut columns = Vec::new();
        let mut rows = Vec::new();

        if let Some(first) = tuples.first() {
            for key in first.keys() {
                columns.push(ColumnMeta {
                    name: key.clone(),
                    r#type: "any".to_string(),
                });
            }
        }

        for tuple in tuples {
            let mut row = Vec::new();
            for col in &columns {
                let val = tuple.get(&col.name).cloned().unwrap_or(Value::Null);
                row.push(val.to_json());
            }
            rows.push(row);
        }

        Ok(QueryResult {
            columns,
            rows,
            stats: None,
        })
    }

    fn execute_node(&self, node: &PlanNode) -> Result<Vec<Tuple>, EngineError> {
        match node {
            PlanNode::LabelScan { variable, label } => {
                let nodes = self.store.scan_by_label(label)?;
                Ok(nodes.into_iter().map(|n| {
                    let mut tuple = HashMap::new();
                    tuple.insert(variable.clone(), Value::NodeId(n.id));
                    // Add properties to tuple
                    for (k, v) in n.properties {
                        let prop_key = format!("{}.{}", variable, k);
                        tuple.insert(prop_key, v);
                    }
                    tuple
                }).collect())
            }
            PlanNode::FullScan { variable } => {
                let nodes = self.store.scan_all()?;
                Ok(nodes.into_iter().map(|n| {
                    let mut tuple = HashMap::new();
                    tuple.insert(variable.clone(), Value::NodeId(n.id));
                    for (k, v) in n.properties {
                        let prop_key = format!("{}.{}", variable, k);
                        tuple.insert(prop_key, v);
                    }
                    tuple
                }).collect())
            }
            PlanNode::Filter { input, predicate } => {
                let tuples = self.execute_node(input)?;
                Ok(tuples.into_iter().filter(|t| {
                    self.eval_expr(predicate, t).ok()
                        .and_then(|v| match v {
                            Value::Bool(b) => Some(b),
                            _ => None,
                        })
                        .unwrap_or(false)
                }).collect())
            }
            PlanNode::Project { input, items } => {
                let tuples = self.execute_node(input)?;
                Ok(tuples.into_iter().map(|t| {
                    let mut result = HashMap::new();
                    for item in items {
                        if let Ok(val) = self.eval_expr(&item.expr, &t) {
                            let key = item.alias.clone().unwrap_or_else(|| {
                                match &item.expr {
                                    Expr::Ident(name) => name.clone(),
                                    Expr::Property(var, prop) => format!("{}.{}", var, prop),
                                    _ => "?".to_string(),
                                }
                            });
                            result.insert(key, val);
                        }
                    }
                    result
                }).collect())
            }
            PlanNode::Aggregate { input, group_by, aggregates } => {
                let tuples = self.execute_node(input)?;
                
                if group_by.is_empty() {
                    // Global aggregation (no GROUP BY)
                    let mut result = HashMap::new();
                    for (alias, agg_expr) in aggregates {
                        let val = self.eval_aggregate(agg_expr, &tuples)?;
                        result.insert(alias.clone(), val);
                    }
                    Ok(vec![result])
                } else {
                    // GROUP BY aggregation
                    let mut groups: HashMap<Vec<String>, Vec<Tuple>> = HashMap::new();
                    
                    // Group tuples by group_by expressions
                    for tuple in tuples {
                        let mut group_key = Vec::new();
                        for expr in group_by {
                            let val = self.eval_expr(expr, &tuple)?;
                            group_key.push(format!("{:?}", val)); // Simple key serialization
                        }
                        groups.entry(group_key).or_insert_with(Vec::new).push(tuple);
                    }
                    
                    // Compute aggregates for each group
                    let mut results = Vec::new();
                    for (_group_key, group_tuples) in groups {
                        let mut result = HashMap::new();
                        
                        // Add GROUP BY columns (from first tuple of group)
                        if let Some(first) = group_tuples.first() {
                            for (idx, expr) in group_by.iter().enumerate() {
                                let val = self.eval_expr(expr, first)?;
                                let key = match expr {
                                    Expr::Ident(name) => name.clone(),
                                    Expr::Property(var, prop) => format!("{}.{}", var, prop),
                                    _ => format!("group_{}", idx),
                                };
                                result.insert(key, val);
                            }
                        }
                        
                        // Compute aggregates
                        for (alias, agg_expr) in aggregates {
                            let val = self.eval_aggregate(agg_expr, &group_tuples)?;
                            result.insert(alias.clone(), val);
                        }
                        
                        results.push(result);
                    }
                    
                    Ok(results)
                }
            }
            PlanNode::OrderBy { input, items } => {
                let mut tuples = self.execute_node(input)?;
                tuples.sort_by(|a, b| {
                    for item in items {
                        let val_a = self.eval_expr(&item.expr, a).ok();
                        let val_b = self.eval_expr(&item.expr, b).ok();
                        let cmp = match (val_a, val_b) {
                            (Some(Value::Int(ia)), Some(Value::Int(ib))) => ia.cmp(&ib),
                            (Some(Value::Float(fa)), Some(Value::Float(fb))) => {
                                fa.partial_cmp(&fb).unwrap_or(std::cmp::Ordering::Equal)
                            }
                            (Some(Value::String(sa)), Some(Value::String(sb))) => sa.cmp(&sb),
                            _ => std::cmp::Ordering::Equal,
                        };
                        if cmp != std::cmp::Ordering::Equal {
                            return if item.descending { cmp.reverse() } else { cmp };
                        }
                    }
                    std::cmp::Ordering::Equal
                });
                Ok(tuples)
            }
            PlanNode::Limit { input, count } => {
                let tuples = self.execute_node(input)?;
                Ok(tuples.into_iter().take(*count as usize).collect())
            }
            PlanNode::Expand { input, from_var, edge_var, to_var, edge_type } => {
                let input_tuples = self.execute_node(input)?;
                let mut result = Vec::new();

                for tuple in input_tuples {
                    // Get from_node_id
                    if let Some(Value::NodeId(from_id)) = tuple.get(from_var) {
                        // Get neighbors
                        let neighbors = self.store.get_neighbors(*from_id, edge_type.as_deref())?;
                        
                        for (edge, to_node) in neighbors {
                            let mut new_tuple = tuple.clone();
                            
                            // Add to_node to tuple
                            new_tuple.insert(to_var.clone(), Value::NodeId(to_node.id));
                            for (k, v) in &to_node.properties {
                                let prop_key = format!("{}.{}", to_var, k);
                                new_tuple.insert(prop_key, v.clone());
                            }
                            
                            // Add edge to tuple if variable specified
                            if let Some(ref ev) = edge_var {
                                new_tuple.insert(ev.clone(), Value::Int(edge.id as i64));
                                for (k, v) in &edge.properties {
                                    let prop_key = format!("{}.{}", ev, k);
                                    new_tuple.insert(prop_key, v.clone());
                                }
                            }
                            
                            result.push(new_tuple);
                        }
                    }
                }
                
                Ok(result)
            }
        }
    }

    fn eval_expr(&self, expr: &Expr, tuple: &Tuple) -> Result<Value, EngineError> {
        match expr {
            Expr::Literal(lit) => Ok(match lit {
                Literal::String(s) => Value::String(s.clone()),
                Literal::Int(i) => Value::Int(*i),
                Literal::Float(f) => Value::Float(*f),
                Literal::Bool(b) => Value::Bool(*b),
                Literal::Null => Value::Null,
            }),
            Expr::Ident(name) => {
                tuple.get(name).cloned()
                    .ok_or_else(|| EngineError::InvalidArgument(format!("variable not found: {}", name)))
            }
            Expr::Property(var, prop) => {
                let key = format!("{}.{}", var, prop);
                tuple.get(&key).cloned()
                    .ok_or_else(|| EngineError::InvalidArgument(format!("property not found: {}", key)))
            }
            Expr::BinaryOp(left, op, right) => {
                let l = self.eval_expr(left, tuple)?;
                let r = self.eval_expr(right, tuple)?;
                self.eval_binary_op(&l, op, &r)
            }
            Expr::UnaryOp(op, operand) => {
                let val = self.eval_expr(operand, tuple)?;
                match op {
                    UnOp::Not => match val {
                        Value::Bool(b) => Ok(Value::Bool(!b)),
                        _ => Err(EngineError::InvalidArgument("NOT requires boolean".into())),
                    }
                }
            }
            Expr::Aggregate(_, _) => Err(EngineError::InvalidArgument("aggregate must be evaluated at Project".into())),
        }
    }

    fn eval_binary_op(&self, left: &Value, op: &BinOp, right: &Value) -> Result<Value, EngineError> {
        match (left, right) {
            (Value::Int(l), Value::Int(r)) => Ok(Value::Bool(match op {
                BinOp::Eq => l == r,
                BinOp::Ne => l != r,
                BinOp::Lt => l < r,
                BinOp::Le => l <= r,
                BinOp::Gt => l > r,
                BinOp::Ge => l >= r,
                _ => return Err(EngineError::InvalidArgument("invalid int op".into())),
            })),
            (Value::Bool(l), Value::Bool(r)) => Ok(Value::Bool(match op {
                BinOp::And => *l && *r,
                BinOp::Or => *l || *r,
                BinOp::Eq => l == r,
                BinOp::Ne => l != r,
                _ => return Err(EngineError::InvalidArgument("invalid bool op".into())),
            })),
            (Value::String(l), Value::String(r)) => Ok(Value::Bool(match op {
                BinOp::Eq => l == r,
                BinOp::Ne => l != r,
                _ => return Err(EngineError::InvalidArgument("invalid string op".into())),
            })),
            _ => Err(EngineError::InvalidArgument("type mismatch in binary op".into())),
        }
    }
    
    fn eval_aggregate(&self, expr: &Expr, tuples: &[Tuple]) -> Result<Value, EngineError> {
        match expr {
            Expr::Aggregate(func, arg) => match func {
                AggFunc::Count => Ok(Value::Int(tuples.len() as i64)),
                AggFunc::Sum => {
                    let mut sum = 0.0f64;
                    for t in tuples {
                        if let Ok(v) = self.eval_expr(arg, t) {
                            match v {
                                Value::Int(i) => sum += i as f64,
                                Value::Float(f) => sum += f,
                                _ => {}
                            }
                        }
                    }
                    Ok(Value::Float(sum))
                }
                AggFunc::Avg => {
                    let mut sum = 0.0f64;
                    let mut cnt = 0usize;
                    for t in tuples {
                        if let Ok(v) = self.eval_expr(arg, t) {
                            match v {
                                Value::Int(i) => { sum += i as f64; cnt += 1; }
                                Value::Float(f) => { sum += f; cnt += 1; }
                                _ => {}
                            }
                        }
                    }
                    if cnt == 0 { Ok(Value::Null) } else { Ok(Value::Float(sum / cnt as f64)) }
                }
                AggFunc::Min => {
                    let mut best: Option<f64> = None;
                    for t in tuples {
                        if let Ok(v) = self.eval_expr(arg, t) {
                            let cur = match v { Value::Int(i) => i as f64, Value::Float(f) => f, _ => continue };
                            best = Some(match best { Some(b) => b.min(cur), None => cur });
                        }
                    }
                    Ok(best.map(Value::Float).unwrap_or(Value::Null))
                }
                AggFunc::Max => {
                    let mut best: Option<f64> = None;
                    for t in tuples {
                        if let Ok(v) = self.eval_expr(arg, t) {
                            let cur = match v { Value::Int(i) => i as f64, Value::Float(f) => f, _ => continue };
                            best = Some(match best { Some(b) => b.max(cur), None => cur });
                        }
                    }
                    Ok(best.map(Value::Float).unwrap_or(Value::Null))
                }
            },
            _ => Err(EngineError::InvalidArgument("expected aggregate expression".into())),
        }
    }
}
