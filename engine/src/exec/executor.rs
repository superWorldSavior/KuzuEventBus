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
    parameters: HashMap<String, Value>,
}

impl<'a> Executor<'a> {
    pub fn new(store: &'a dyn GraphStore) -> Self {
        Self { 
            store,
            parameters: HashMap::new(),
        }
    }

    pub fn with_parameters(store: &'a dyn GraphStore, parameters: HashMap<String, Value>) -> Self {
        Self { store, parameters }
    }

    /// Validate that all required parameters are bound
    fn validate_parameters(&self, required_params: &std::collections::HashSet<String>) -> Result<(), EngineError> {
        for param in required_params {
            if !self.parameters.contains_key(param) {
                return Err(EngineError::InvalidArgument(format!(
                    "Required parameter ${} is not bound. Pass it via the params argument.",
                    param
                )));
            }
        }
        Ok(())
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
        self.execute_node_with_context(node, &HashMap::new())
    }
    fn execute_node_with_context(&self, node: &PlanNode, parent_tuple: &Tuple) -> Result<Vec<Tuple>, EngineError> {
        match node {
            PlanNode::LabelScan { variable, label } => {
                // Check if variable already exists in parent tuple (correlated subquery)
                if let Some(existing_node_id) = parent_tuple.get(variable) {
                    // Variable exists in parent context - use it directly (correlated)
                    if let Value::NodeId(node_id) = existing_node_id {
                        // Fetch the node to verify it has the correct label
                        if let Ok(Some(node)) = self.store.get_node(*node_id) {
                            if node.labels.contains(label) {
                                // Node matches - return single tuple with parent context
                                let mut tuple = parent_tuple.clone();
                                tuple.insert(variable.clone(), Value::NodeId(*node_id));
                                for (k, v) in node.properties {
                                    let prop_key = format!("{}.{}", variable, k);
                                    tuple.insert(prop_key, v);
                                }
                                return Ok(vec![tuple]);
                            }
                        }
                    }
                    // Variable exists but doesn't match - return empty
                    return Ok(vec![]);
                }
                
                // Variable doesn't exist in parent - normal scan
                let nodes = self.store.scan_by_label(label)?;
                Ok(nodes.into_iter().map(|n| {
                    let mut tuple = parent_tuple.clone();
                    tuple.insert(variable.clone(), Value::NodeId(n.id));
                    for (k, v) in n.properties {
                        let prop_key = format!("{}.{}", variable, k);
                        tuple.insert(prop_key, v);
                    }
                    tuple
                }).collect())
            }
            PlanNode::FullScan { variable } => {
                // Correlated subquery: if the variable already exists in parent context, reuse it
                if let Some(existing_node_id) = parent_tuple.get(variable) {
                    if let Value::NodeId(node_id) = existing_node_id {
                        if let Ok(Some(node)) = self.store.get_node(*node_id) {
                            let mut tuple = parent_tuple.clone();
                            tuple.insert(variable.clone(), Value::NodeId(*node_id));
                            for (k, v) in node.properties {
                                let prop_key = format!("{}.{}", variable, k);
                                tuple.insert(prop_key, v);
                            }
                            return Ok(vec![tuple]);
                        }
                    }
                    // Variable exists but cannot be resolved -> empty
                    return Ok(vec![]);
                }
                // Non-correlated: scan all nodes
                let nodes = self.store.scan_all()?;
                Ok(nodes.into_iter().map(|n| {
                    let mut tuple = parent_tuple.clone();
                    tuple.insert(variable.clone(), Value::NodeId(n.id));
                    for (k, v) in n.properties {
                        let prop_key = format!("{}.{}", variable, k);
                        tuple.insert(prop_key, v.clone());
                    }
                    tuple
                }).collect())
            }
            PlanNode::Filter { input, predicate } => {
                let tuples = self.execute_node_with_context(input, parent_tuple)?;
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
                let tuples = self.execute_node_with_context(input, parent_tuple)?;
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
                let tuples = self.execute_node_with_context(input, parent_tuple)?;
                
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
                let mut tuples = self.execute_node_with_context(input, parent_tuple)?;
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
                let tuples = self.execute_node_with_context(input, parent_tuple)?;
                Ok(tuples.into_iter().take(*count as usize).collect())
            }
            PlanNode::Expand { input, from_var, edge_var, to_var, edge_type, direction, depth } => {
                use super::ast::Direction;
                
                let input_tuples = self.execute_node_with_context(input, parent_tuple)?;
                let mut result = Vec::new();

                for tuple in input_tuples {
                    // Get from_node_id
                    if let Some(Value::NodeId(from_id)) = tuple.get(from_var) {
                        // Check if variable-length path
                        if let Some(depth_range) = depth {
                            // Variable-length traversal
                            let reachable = self.traverse_variable_length(
                                *from_id,
                                edge_type.as_deref(),
                                depth_range.min,
                                depth_range.max
                            )?;
                            
                            for to_node in reachable {
                                let mut new_tuple = tuple.clone();
                                new_tuple.insert(to_var.clone(), Value::NodeId(to_node.id));
                                for (k, v) in &to_node.properties {
                                    let prop_key = format!("{}.{}", to_var, k);
                                    new_tuple.insert(prop_key, v.clone());
                                }
                                result.push(new_tuple);
                            }
                        } else {
                            // Single-hop traversal with direction support
                            // Check for union types (e.g., [:BOSS|FRIEND])
                            let edge_types: Vec<&str> = if let Some(et) = edge_type {
                                et.split('|').map(|s| s.trim()).collect()
                            } else {
                                vec![]
                            };
                            
                            let mut neighbors = match direction {
                                Direction::Right => {
                                    // Outgoing: (from)-[:REL]->(to)
                                    self.store.get_neighbors(*from_id, None)?
                                }
                                Direction::Left => {
                                    // Incoming: (to)-[:REL]->(from) donc on cherche incoming
                                    self.store.get_neighbors_incoming(*from_id, None)?
                                }
                                Direction::Both => {
                                    // Both directions: combine outgoing + incoming
                                    let mut out = self.store.get_neighbors(*from_id, None)?;
                                    let incoming = self.store.get_neighbors_incoming(*from_id, None)?;
                                    out.extend(incoming);
                                    out
                                }
                            };
                            
                            // Filter by edge types if union specified
                            if !edge_types.is_empty() {
                                neighbors.retain(|(edge, _)| edge_types.contains(&edge.edge_type.as_str()));
                            }
                            
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
                                    // Add edge type for union type support
                                    let edge_type_key = format!("{}.edge_type", ev);
                                    new_tuple.insert(edge_type_key, Value::String(edge.edge_type.clone()));
                                    for (k, v) in &edge.properties {
                                        let prop_key = format!("{}.{}", ev, k);
                                        new_tuple.insert(prop_key, v.clone());
                                    }
                                }
                                
                                result.push(new_tuple);
                            }
                        }
                    }
                }
                
                Ok(result)
            }
        }
    }

    /// Traverse variable-length paths using BFS
    fn traverse_variable_length(
        &self,
        start_id: u64,
        edge_type: Option<&str>,
        min_depth: u32,
        max_depth: u32
    ) -> Result<Vec<crate::index::Node>, EngineError> {
        use std::collections::{HashSet, VecDeque};
        
        let mut result = Vec::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        
        // BFS: (node_id, current_depth)
        queue.push_back((start_id, 0));
        visited.insert(start_id);
        
        while let Some((node_id, depth)) = queue.pop_front() {
            // If we've reached max depth, stop expanding from this node
            if depth >= max_depth {
                continue;
            }
            
            // Get neighbors
            let neighbors = self.store.get_neighbors(node_id, edge_type)?;
            
            for (_edge, to_node) in neighbors {
                if !visited.contains(&to_node.id) {
                    visited.insert(to_node.id);
                    
                    // Add to result if within depth range
                    let next_depth = depth + 1;
                    if next_depth >= min_depth && next_depth <= max_depth {
                        result.push(to_node.clone());
                    }
                    
                    // Continue BFS if haven't reached max depth
                    if next_depth < max_depth {
                        queue.push_back((to_node.id, next_depth));
                    }
                }
            }
        }
        
        Ok(result)
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
            Expr::Parameter(param_name) => {
                self.parameters
                    .get(param_name)
                    .cloned()
                    .ok_or_else(|| EngineError::InvalidArgument(format!(
                        "parameter ${} not bound - pass it in params argument",
                        param_name
                    )))
            }
            Expr::IsNull(expr) => {
                let val = self.eval_expr(expr, tuple)?;
                Ok(Value::Bool(matches!(val, Value::Null)))
            }
            Expr::IsNotNull(expr) => {
                let val = self.eval_expr(expr, tuple)?;
                Ok(Value::Bool(!matches!(val, Value::Null)))
            }
            Expr::FunctionCall(name, args) => {
                match name.to_uppercase().as_str() {
                    "ID" => {
                        // ID(node) - extract node ID from node reference
                        if args.len() != 1 {
                            return Err(EngineError::InvalidArgument("ID() requires exactly 1 argument".into()));
                        }
                        let arg_val = self.eval_expr(&args[0], tuple)?;
                        match arg_val {
                            Value::NodeId(id) => Ok(Value::Int(id as i64)),
                            _ => Err(EngineError::InvalidArgument("ID() requires a node argument".into())),
                        }
                    }
                    _ => Err(EngineError::InvalidArgument(format!("unknown function: {}", name))),
                }
            }
            Expr::Exists(subquery) => {
                // Only use fast-path if there is no WHERE clause inside the subquery
                if subquery.where_clause.is_none() {
                    // Fast-path: if subquery is a simple edge pattern starting from a variable
                    if let Some(first_pat) = subquery.match_clause.patterns.get(0) {
                        if let super::ast::Pattern::Edge(edge) = first_pat {
                            if let Some(ref from_var) = edge.from_node.variable {
                                if let Some(Value::NodeId(from_id)) = tuple.get(from_var) {
                                    // Optional target labels to enforce
                                    let target_labels = &edge.to_node.labels;
                                    let label_matches = |node: &crate::index::Node| -> bool {
                                        if target_labels.is_empty() { return true; }
                                        target_labels.iter().any(|lbl| node.labels.contains(lbl))
                                    };
                                    // Handle variable-length or single-hop
                                    let has_any = if let Some(depth_range) = &edge.depth {
                                        let reachable = self.traverse_variable_length(
                                            *from_id,
                                            edge.edge_type.as_deref(),
                                            depth_range.min,
                                            depth_range.max,
                                        )?;
                                        reachable.into_iter().any(|n| label_matches(&n))
                                    } else {
                                        let neighbors = self.store.get_neighbors(*from_id, edge.edge_type.as_deref())?;
                                        neighbors.into_iter().any(|(_e, to)| label_matches(&to))
                                    };
                                    return Ok(Value::Bool(has_any));
                                }
                            }
                        }
                    }
                }

                // Fallback: Execute the subquery plan in the context of current tuple
                let plan = crate::exec::planner::Planner::plan(subquery)
                    .map_err(|e| EngineError::InvalidArgument(format!("EXISTS subquery planning error: {:?}", e)))?;
                let sub_executor = if self.parameters.is_empty() {
                    Executor::new(self.store)
                } else {
                    Executor::with_parameters(self.store, self.parameters.clone())
                };
                let sub_tuples = sub_executor.execute_node_with_context(&plan.root, tuple)?;
                Ok(Value::Bool(!sub_tuples.is_empty()))
            }
            Expr::Aggregate(_, _) => Err(EngineError::InvalidArgument("aggregate must be evaluated at Project".into())),
        }
    }

    fn eval_binary_op(&self, left: &Value, op: &BinOp, right: &Value) -> Result<Value, EngineError> {
        match (left, right) {
            // Int operations (arithmetic + comparison)
            (Value::Int(l), Value::Int(r)) => match op {
                // Arithmetic
                BinOp::Add => Ok(Value::Int(l + r)),
                BinOp::Sub => Ok(Value::Int(l - r)),
                BinOp::Mul => Ok(Value::Int(l * r)),
                BinOp::Div => {
                    if *r == 0 {
                        Err(EngineError::InvalidArgument("division by zero".into()))
                    } else {
                        Ok(Value::Int(l / r))
                    }
                }
                // Comparison
                BinOp::Eq => Ok(Value::Bool(l == r)),
                BinOp::Ne => Ok(Value::Bool(l != r)),
                BinOp::Lt => Ok(Value::Bool(l < r)),
                BinOp::Le => Ok(Value::Bool(l <= r)),
                BinOp::Gt => Ok(Value::Bool(l > r)),
                BinOp::Ge => Ok(Value::Bool(l >= r)),
                _ => Err(EngineError::InvalidArgument("invalid int op".into())),
            },
            // Float operations (arithmetic + comparison)
            (Value::Float(l), Value::Float(r)) => match op {
                // Arithmetic
                BinOp::Add => Ok(Value::Float(l + r)),
                BinOp::Sub => Ok(Value::Float(l - r)),
                BinOp::Mul => Ok(Value::Float(l * r)),
                BinOp::Div => {
                    if *r == 0.0 {
                        Err(EngineError::InvalidArgument("division by zero".into()))
                    } else {
                        Ok(Value::Float(l / r))
                    }
                }
                // Comparison
                BinOp::Eq => Ok(Value::Bool(l == r)),
                BinOp::Ne => Ok(Value::Bool(l != r)),
                BinOp::Lt => Ok(Value::Bool(l < r)),
                BinOp::Le => Ok(Value::Bool(l <= r)),
                BinOp::Gt => Ok(Value::Bool(l > r)),
                BinOp::Ge => Ok(Value::Bool(l >= r)),
                _ => Err(EngineError::InvalidArgument("invalid float op".into())),
            },
            // Mixed int/float (coercion to float)
            (Value::Int(l), Value::Float(r)) => {
                let lf = *l as f64;
                match op {
                    // Arithmetic
                    BinOp::Add => Ok(Value::Float(lf + r)),
                    BinOp::Sub => Ok(Value::Float(lf - r)),
                    BinOp::Mul => Ok(Value::Float(lf * r)),
                    BinOp::Div => {
                        if *r == 0.0 {
                            Err(EngineError::InvalidArgument("division by zero".into()))
                        } else {
                            Ok(Value::Float(lf / r))
                        }
                    }
                    // Comparison
                    BinOp::Eq => Ok(Value::Bool(lf == *r)),
                    BinOp::Ne => Ok(Value::Bool(lf != *r)),
                    BinOp::Lt => Ok(Value::Bool(lf < *r)),
                    BinOp::Le => Ok(Value::Bool(lf <= *r)),
                    BinOp::Gt => Ok(Value::Bool(lf > *r)),
                    BinOp::Ge => Ok(Value::Bool(lf >= *r)),
                    _ => Err(EngineError::InvalidArgument("invalid numeric op".into())),
                }
            }
            (Value::Float(l), Value::Int(r)) => {
                let rf = *r as f64;
                match op {
                    // Arithmetic
                    BinOp::Add => Ok(Value::Float(l + rf)),
                    BinOp::Sub => Ok(Value::Float(l - rf)),
                    BinOp::Mul => Ok(Value::Float(l * rf)),
                    BinOp::Div => {
                        if *r == 0 {
                            Err(EngineError::InvalidArgument("division by zero".into()))
                        } else {
                            Ok(Value::Float(l / rf))
                        }
                    }
                    // Comparison
                    BinOp::Eq => Ok(Value::Bool(*l == rf)),
                    BinOp::Ne => Ok(Value::Bool(*l != rf)),
                    BinOp::Lt => Ok(Value::Bool(*l < rf)),
                    BinOp::Le => Ok(Value::Bool(*l <= rf)),
                    BinOp::Gt => Ok(Value::Bool(*l > rf)),
                    BinOp::Ge => Ok(Value::Bool(*l >= rf)),
                    _ => Err(EngineError::InvalidArgument("invalid numeric op".into())),
                }
            }
            // Bool comparisons
            (Value::Bool(l), Value::Bool(r)) => Ok(Value::Bool(match op {
                BinOp::And => *l && *r,
                BinOp::Or => *l || *r,
                BinOp::Eq => l == r,
                BinOp::Ne => l != r,
                _ => return Err(EngineError::InvalidArgument("invalid bool op".into())),
            })),
            // String comparisons
            (Value::String(l), Value::String(r)) => Ok(Value::Bool(match op {
                BinOp::Eq => l == r,
                BinOp::Ne => l != r,
                _ => return Err(EngineError::InvalidArgument("invalid string op".into())),
            })),
            _ => Err(EngineError::InvalidArgument(format!(
                "type mismatch in binary op: {:?} {:?} {:?}",
                left, op, right
            ))),
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
