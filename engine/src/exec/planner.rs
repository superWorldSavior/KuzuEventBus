//! Planner: transforme AST en plan d'exécution physique

use super::ast::*;
use crate::types::EngineError;

#[derive(Debug, Clone)]
pub struct ExecutionPlan {
    pub root: PlanNode,
}

#[derive(Debug, Clone)]
pub enum PlanNode {
    // Scan nodes by label (uses label index if available)
    LabelScan {
        variable: String,
        label: String,
    },
    // Full table scan (no index)
    FullScan {
        variable: String,
    },
    // Filter predicate
    Filter {
        input: Box<PlanNode>,
        predicate: Expr,
    },
    // Project (select columns)
    Project {
        input: Box<PlanNode>,
        items: Vec<ReturnItem>,
    },
    // Order results
    OrderBy {
        input: Box<PlanNode>,
        items: Vec<super::ast::OrderByItem>,
    },
    // Aggregate (with optional GROUP BY)
    Aggregate {
        input: Box<PlanNode>,
        group_by: Vec<Expr>,
        aggregates: Vec<(String, Expr)>, // (alias, aggregate_expr)
    },
    // Limit results
    Limit {
        input: Box<PlanNode>,
        count: u64,
    },
    // Expand edges (adjacency traversal)
    Expand {
        input: Box<PlanNode>,
        from_var: String,
        edge_var: Option<String>,
        to_var: String,
        edge_type: Option<String>,
        direction: Direction,  // Left (<-), Right (->), Both (-)
        depth: Option<super::ast::DepthRange>,  // For variable-length paths
    },
}

pub struct Planner;

impl Planner {
    pub fn plan(query: &Query) -> Result<ExecutionPlan, EngineError> {
        // Start with scan from MATCH clause
        let mut plan = Self::plan_match(&query.match_clause)?;

        // Apply WITH transformation if present (pipeline intermediate projection)
        if let Some(ref with_clause) = query.with_clause {
            // Convert WithItem to ReturnItem for projection
            let items: Vec<ReturnItem> = with_clause.items.iter()
                .map(|item| ReturnItem {
                    expr: item.expr.clone(),
                    alias: Some(item.alias.clone()),
                })
                .collect();
            
            plan = PlanNode::Project {
                input: Box::new(plan),
                items,
            };
        }

        // Apply WHERE filter if present
        if let Some(ref where_clause) = query.where_clause {
            plan = PlanNode::Filter {
                input: Box::new(plan),
                predicate: where_clause.expr.clone(),
            };
        }

        // Check if RETURN has aggregates
        let has_aggregates = query.return_clause.items.iter().any(|item| Self::has_aggregate(&item.expr));
        
        if has_aggregates {
            // Separate GROUP BY expressions from aggregates
            let mut group_by = Vec::new();
            let mut aggregates = Vec::new();
            
            for item in &query.return_clause.items {
                if Self::has_aggregate(&item.expr) {
                    // This is an aggregate
                    let alias = item.alias.clone().unwrap_or_else(|| {
                        match &item.expr {
                            Expr::Aggregate(func, _) => format!("{:?}", func).to_lowercase(),
                            _ => "agg".to_string(),
                        }
                    });
                    aggregates.push((alias, item.expr.clone()));
                } else {
                    // Non-aggregate in SELECT with aggregate → implicit GROUP BY
                    group_by.push(item.expr.clone());
                }
            }
            
            plan = PlanNode::Aggregate {
                input: Box::new(plan),
                group_by,
                aggregates,
            };
        } else {
            // Normal projection
            plan = PlanNode::Project {
                input: Box::new(plan),
                items: query.return_clause.items.clone(),
            };
        }

        // Apply ORDER BY if present
        if let Some(ref order_by) = query.order_by {
            plan = PlanNode::OrderBy {
                input: Box::new(plan),
                items: order_by.items.clone(),
            };
        }

        // Apply LIMIT if present
        if let Some(limit) = query.limit {
            plan = PlanNode::Limit {
                input: Box::new(plan),
                count: limit,
            };
        }

        Ok(ExecutionPlan { root: plan })
    }

    fn plan_match(match_clause: &MatchClause) -> Result<PlanNode, EngineError> {
        if match_clause.patterns.is_empty() {
            return Err(EngineError::InvalidArgument("empty MATCH clause".into()));
        }

        let mut plan_opt: Option<PlanNode> = None;

        for (idx, pat) in match_clause.patterns.iter().enumerate() {
            match pat {
                Pattern::Node(node) => {
                    if plan_opt.is_none() {
                        let var = node.variable.clone()
                            .ok_or_else(|| EngineError::InvalidArgument("node must have variable".into()))?;
                        // If node has label, use label scan; otherwise full scan
                        let plan = if let Some(label) = node.labels.first() {
                            PlanNode::LabelScan { variable: var, label: label.clone() }
                        } else {
                            PlanNode::FullScan { variable: var }
                        };
                        plan_opt = Some(plan);
                    } else {
                        // Multiple standalone nodes in a single MATCH not yet supported
                        return Err(EngineError::InvalidArgument(format!(
                            "unexpected standalone node at position {} in MATCH",
                            idx
                        )));
                    }
                }
                Pattern::Edge(edge) => {
                    // Determine input plan: if none yet, scan from_node; otherwise reuse current plan
                    let from_var = edge.from_node.variable.clone()
                        .ok_or_else(|| EngineError::InvalidArgument("from node must have variable".into()))?;
                    let to_var = edge.to_node.variable.clone()
                        .ok_or_else(|| EngineError::InvalidArgument("to node must have variable".into()))?;

                    let input_plan = if let Some(current) = plan_opt.take() {
                        current
                    } else {
                        // Start with scan of from_node
                        if let Some(label) = edge.from_node.labels.first() {
                            PlanNode::LabelScan { variable: from_var.clone(), label: label.clone() }
                        } else {
                            PlanNode::FullScan { variable: from_var.clone() }
                        }
                    };

                    // Add expand wrapping previous plan
                    let expand = PlanNode::Expand {
                        input: Box::new(input_plan),
                        from_var,
                        edge_var: edge.variable.clone(),
                        to_var,
                        edge_type: edge.edge_type.clone(),
                        direction: edge.direction.clone(),
                        depth: edge.depth.clone(),
                    };
                    plan_opt = Some(expand);
                }
            }
        }

        plan_opt.ok_or_else(|| EngineError::InvalidArgument("invalid MATCH plan".into()))
    }
    
    fn has_aggregate(expr: &Expr) -> bool {
        match expr {
            Expr::Aggregate(_, _) => true,
            Expr::BinaryOp(l, _, r) => Self::has_aggregate(l) || Self::has_aggregate(r),
            Expr::UnaryOp(_, e) => Self::has_aggregate(e),
            _ => false,
        }
    }
}
