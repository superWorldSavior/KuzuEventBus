use crate::AppState;
use std::collections::HashMap;

pub type NodePositions = HashMap<String, (f64, f64)>;

/// Simple spring layout with fixed iterations
pub fn compute_spring_layout(state: &AppState, iterations: usize) -> NodePositions {
    let n = state.nodes.len();
    if n == 0 {
        return HashMap::new();
    }

    // Initialize with radial layout
    let mut positions: HashMap<String, (f64, f64)> = HashMap::new();
    let radius = 40.0;
    let center = (50.0, 50.0);
    
    for (i, node) in state.nodes.iter().enumerate() {
        let t = i as f64 / n as f64 * std::f64::consts::TAU;
        let x = center.0 + radius * t.cos();
        let y = center.1 + radius * t.sin();
        positions.insert(node.id.clone(), (x, y));
    }

    // Spring parameters
    let k_spring = 0.05;
    let k_repel = 200.0;
    let damping = 0.8;

    for _ in 0..iterations {
        let mut forces: HashMap<String, (f64, f64)> = HashMap::new();

        // Repulsion between all nodes
        for i in 0..n {
            for j in (i + 1)..n {
                let n1 = &state.nodes[i];
                let n2 = &state.nodes[j];
                
                if let (Some((x1, y1)), Some((x2, y2))) = 
                    (positions.get(&n1.id), positions.get(&n2.id)) {
                    let dx = x2 - x1;
                    let dy = y2 - y1;
                    let dist = (dx * dx + dy * dy).sqrt().max(1.0);
                    let force = k_repel / (dist * dist);
                    let fx = -force * dx / dist;
                    let fy = -force * dy / dist;
                    
                    forces.entry(n1.id.clone()).or_insert((0.0, 0.0)).0 += fx;
                    forces.entry(n1.id.clone()).or_insert((0.0, 0.0)).1 += fy;
                    forces.entry(n2.id.clone()).or_insert((0.0, 0.0)).0 -= fx;
                    forces.entry(n2.id.clone()).or_insert((0.0, 0.0)).1 -= fy;
                }
            }
        }

        // Attraction along edges
        for edge in &state.edges {
            if let (Some((x1, y1)), Some((x2, y2))) = 
                (positions.get(&edge.from), positions.get(&edge.to)) {
                let dx = x2 - x1;
                let dy = y2 - y1;
                let dist = (dx * dx + dy * dy).sqrt().max(1.0);
                let force = k_spring * dist;
                let fx = force * dx / dist;
                let fy = force * dy / dist;
                
                forces.entry(edge.from.clone()).or_insert((0.0, 0.0)).0 += fx;
                forces.entry(edge.from.clone()).or_insert((0.0, 0.0)).1 += fy;
                forces.entry(edge.to.clone()).or_insert((0.0, 0.0)).0 -= fx;
                forces.entry(edge.to.clone()).or_insert((0.0, 0.0)).1 -= fy;
            }
        }

        // Apply forces with damping and bounds
        for node in &state.nodes {
            if let Some((fx, fy)) = forces.get(&node.id) {
                if let Some((x, y)) = positions.get_mut(&node.id) {
                    *x += fx * damping;
                    *y += fy * damping;
                    // Keep within bounds
                    *x = x.max(10.0).min(90.0);
                    *y = y.max(10.0).min(90.0);
                }
            }
        }
    }

    positions
}
