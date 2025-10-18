use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Paragraph};
use crate::AppState;
use crate::theme::THEME;
use std::collections::HashMap;

/// Vertical git log view (latest on top) with git log --graph lanes
pub fn render(f: &mut Frame, area: Rect, state: &AppState) {
    let block = Block::default()
        .title(format!(" Git Log — {} ", state.current))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(THEME.border));
    let inner = block.inner(area);
    f.render_widget(block, area);

    if inner.height < 3 || inner.width < 20 { return; }

    // Prepare commits in display order (latest first)
    let total = state.commits.len();
    if total == 0 { return; }
    
    let start = state.log_scroll;
    let page_size = inner.height.saturating_sub(1) as usize;
    
    let commits_to_show: Vec<String> = state.commits.iter().rev().skip(start).take(page_size).cloned().collect();
    
    // Assign lanes to branches (sorted order)
    let mut branch_names: Vec<String> = state.branches.keys().cloned().collect();
    branch_names.sort();
    // Put main first if present
    if let Some(pos) = branch_names.iter().position(|b| b == "main") {
        branch_names.remove(pos);
        branch_names.insert(0, "main".to_string());
    }
    
    let branch_lanes: HashMap<String, usize> = branch_names.iter()
        .enumerate()
        .map(|(i, b)| (b.clone(), i))
        .collect();
    
    let num_lanes = branch_names.len();
    
    // Build parent map
    let parents = &state.parents;
    
    // Pre-compute lane per commit using commit_origin (stable per-branch lane)
    let commit_lanes_vec: Vec<usize> = commits_to_show.iter().map(|id| {
        if let Some(b) = state.commit_origin.get(id) {
            *branch_lanes.get(b).unwrap_or(&0)
        } else {
            // Fallback: find first branch containing this commit
            state.branches.iter()
                .find_map(|(b, list)| if list.contains(id) { branch_lanes.get(b).copied() } else { None })
                .unwrap_or(0)
        }
    }).collect();
    
    // For each lane, compute min/max row where a commit of that lane appears in window
    let mut lane_min_max: Vec<Option<(usize, usize)>> = vec![None; num_lanes.max(1)];
    for (idx, lane) in commit_lanes_vec.iter().enumerate() {
        let entry = &mut lane_min_max[*lane];
        match entry {
            Some((min_i, max_i)) => { if idx < *min_i { *min_i = idx; } if idx > *max_i { *max_i = idx; } },
            None => { lane_min_max[*lane] = Some((idx, idx)); }
        }
    }
    
    // Render lines
    let mut lines: Vec<Line> = Vec::new();
    
    for (idx, id) in commits_to_show.iter().enumerate() {
        // Lane for this commit
        let commit_lane = *commit_lanes_vec.get(idx).unwrap_or(&0);
        
        // Color by branch of origin
        let mut color = THEME.text_secondary;
        if let Some(b) = state.commit_origin.get(id) {
            color = THEME.branch_color(b, false);
        }
        
        let ps = parents.get(id).cloned().unwrap_or_default();
        let is_merge = ps.len() > 1;
        
        // Find merge source lane if this is a merge
        let merge_source_lane = if is_merge && ps.len() > 1 {
            // Second parent is the merged branch
            let merge_parent = &ps[1];
            state.branches.iter()
                .find(|(_, list)| list.contains(merge_parent))
                .and_then(|(b, _)| branch_lanes.get(b).copied())
        } else {
            None
        };
        
        // Build graph columns
        let mut graph_spans: Vec<Span> = Vec::new();
        
        // Check if selected for highlight
        let idx_from_top = start + idx;
        let is_selected = idx_from_top == state.log_scroll + state.log_cursor;
        let final_color = if is_selected { THEME.accent } else { color };
        
        for l in 0..num_lanes {
            if l == commit_lane {
                // Current commit position - bullet is part of the graph
                let bullet = if is_merge { 
                    if is_selected { "◉─" } else { "◆─" }
                } else { 
                    if is_selected { "◉─" } else { "●─" }
                };
                graph_spans.push(Span::styled(bullet, Style::default().fg(final_color).bold()));
            } else if Some(l) == merge_source_lane && l != commit_lane {
                // Draw merge connector from source lane
                if l < commit_lane { graph_spans.push(Span::styled("╱─", Style::default().fg(final_color))); }
                else { graph_spans.push(Span::styled("─╲", Style::default().fg(final_color))); }
            } else {
                // Draw vertical bar only between two commits of that lane within window
                if let Some((min_i, max_i)) = lane_min_max.get(l).and_then(|x| *x) {
                    if idx > min_i && idx < max_i {
                        let lane_color = THEME.branch_color(&branch_names[l], false);
                        graph_spans.push(Span::styled("│ ", Style::default().fg(lane_color)));
                    } else {
                        graph_spans.push(Span::raw("  "));
                    }
                } else {
                    graph_spans.push(Span::raw("  "));
                }
            }
        }
        
        // Badges: HEAD, branch tips
        let mut badges: Vec<Span> = Vec::new();
        for (b, list) in state.branches.iter() {
            if list.last() == Some(id) {
                let lab = if b == &state.current { "HEAD" } else { b.as_str() };
                badges.push(Span::styled(format!(" [{lab}]"), Style::default().fg(THEME.branch_color(b, false))));
            }
        }
        
        // Build line: graph + id (no duplicate bullet)
        let mut row = graph_spans;
        row.push(Span::raw(" "));
        row.push(Span::styled(id.clone(), Style::default().fg(final_color)));
        row.extend(badges);
        
        lines.push(Line::from(row));
    }
    
    let para = Paragraph::new(lines)
        .style(Style::default().fg(THEME.text_primary));
    f.render_widget(para, inner);
}
