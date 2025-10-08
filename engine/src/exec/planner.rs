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
    // Create nodes and edges
    Create {
        patterns: Vec<Pattern>,
    },
    // Match then Create (for MATCH ... CREATE pattern)
    MatchCreate {
        match_input: Box<PlanNode>,
        create_patterns: Vec<Pattern>,
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
    // Cartesian product (for MATCH (a), (b) patterns)
    CartesianProduct {
        left: Box<PlanNode>,
        right: Box<PlanNode>,
    },
}

pub struct Planner;

impl Planner {
    pub fn plan(query: &Query) -> Result<ExecutionPlan, EngineError> {
        // Handle different clause combinations
        let mut plan = if query.match_clause.is_some() && query.create_clause.is_some() {
            // MATCH ... CREATE pattern
            let match_plan = Self::plan_match(query.match_clause.as_ref().unwrap())?;
            PlanNode::MatchCreate {
                match_input: Box::new(match_plan),
                create_patterns: query.create_clause.as_ref().unwrap().patterns.clone(),
            }
        } else if let Some(ref match_clause) = query.match_clause {
            // MATCH only
            Self::plan_match(match_clause)?
        } else if let Some(ref create_clause) = query.create_clause {
            // CREATE only
            Self::plan_create(create_clause)?
        } else {
            return Err(EngineError::InvalidArgument("query must have MATCH or CREATE".into()));
        };

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

        // RETURN is optional for CREATE
        if query.return_clause.is_none() {
            return Ok(ExecutionPlan { root: plan });
        }
        
        let return_clause = query.return_clause.as_ref().unwrap();

        // Check if RETURN has aggregates
        let has_aggregates = return_clause.items.iter().any(|item| Self::has_aggregate(&item.expr));
        
        if has_aggregates {
            // Separate GROUP BY expressions from aggregates
            let mut group_by = Vec::new();
            let mut aggregates = Vec::new();
            
            for item in &return_clause.items {
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
                items: return_clause.items.clone(),
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
                    let var = node.variable.clone()
                        .ok_or_else(|| EngineError::InvalidArgument("node must have variable".into()))?;
                    // Base scan by label or full scan
                    let mut node_plan = if let Some(label) = node.labels.first() {
                        PlanNode::LabelScan { variable: var.clone(), label: label.clone() }
                    } else {
                        PlanNode::FullScan { variable: var.clone() }
                    };
                    // If there are inline properties on the node pattern, add a Filter
                    if !node.properties.is_empty() {
                        // Build predicate: AND of var.prop == literal
                        let mut iter = node.properties.iter();
                        let (first_k, first_v) = iter.next().unwrap();
                        let mut predicate = Expr::BinaryOp(
                            Box::new(Expr::Property(var.clone(), first_k.clone())),
                            BinOp::Eq,
                            Box::new(Expr::Literal(first_v.clone())),
                        );
                        for (k, v) in iter {
                            predicate = Expr::BinaryOp(
                                Box::new(predicate),
                                BinOp::And,
                                Box::new(Expr::BinaryOp(
                                    Box::new(Expr::Property(var.clone(), k.clone())),
                                    BinOp::Eq,
                                    Box::new(Expr::Literal(v.clone())),
                                )),
                            );
                        }
                        node_plan = PlanNode::Filter { input: Box::new(node_plan), predicate };
                    }
                    if plan_opt.is_none() {
                        plan_opt = Some(node_plan);
                    } else {
                        // Multiple standalone nodes: use Cartesian Product
                        plan_opt = Some(PlanNode::CartesianProduct {
                            left: Box::new(plan_opt.take().unwrap()),
                            right: Box::new(node_plan),
                        });
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
    
    fn plan_create(create_clause: &CreateClause) -> Result<PlanNode, EngineError> {
        if create_clause.patterns.is_empty() {
            return Err(EngineError::InvalidArgument("empty CREATE clause".into()));
        }
        
        Ok(PlanNode::Create {
            patterns: create_clause.patterns.clone(),
        })
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
