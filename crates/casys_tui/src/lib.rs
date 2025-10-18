pub mod git_like;
pub mod theme;
pub mod layout;

use ratatui::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const DEFAULT_BRANCH: &str = "main";
const PAGE_SIZE: usize = 20;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub label: String,
    pub branch: String,
    pub pending: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub rel: String,
    pub branch: String,
    pub pending: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UiState {
    pub show_canvas: bool,
    #[serde(skip)]
    pub node_positions: layout::NodePositions,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppState {
    pub branches: HashMap<String, Vec<String>>,
    pub current: String,
    pub commits: Vec<String>,
    pub parents: HashMap<String, Vec<String>>,
    pub commit_origin: HashMap<String, String>,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub ui: UiState,
    pub last_merge_from: Option<String>,
    // Cursor for Git-like navigation (horizontal lanes mode)
    pub cursor_branch: String,
    pub cursor_row: usize,
    // Vertical log view state
    pub log_scroll: usize,
    pub log_cursor: usize,
}

impl AppState {
    pub fn new() -> Self {
        let mut branches = HashMap::new();
        branches.insert("main".to_string(), vec!["c1".to_string()]);
        
        let mut s = Self {
            branches,
            current: "main".to_string(),
            commits: vec!["c1".to_string()],
            parents: HashMap::new(),
            commit_origin: HashMap::new(),
            nodes: vec![
                Node { id: "N1".to_string(), label: "Alice".to_string(), branch: "main".to_string(), pending: false },
                Node { id: "N2".to_string(), label: "Bob".to_string(), branch: "main".to_string(), pending: false },
                Node { id: "N3".to_string(), label: "Carol".to_string(), branch: "main".to_string(), pending: false },
            ],
            edges: vec![
                Edge { from: "N1".to_string(), to: "N2".to_string(), rel: "KNOWS".to_string(), branch: "main".to_string(), pending: false },
                Edge { from: "N1".to_string(), to: "N3".to_string(), rel: "WORKS_WITH".to_string(), branch: "main".to_string(), pending: false },
            ],
            ui: UiState { show_canvas: true, node_positions: HashMap::new() },
            last_merge_from: None,
            cursor_branch: DEFAULT_BRANCH.to_string(),
            cursor_row: 0,
            log_scroll: 0,
            log_cursor: 0,
        };
        // Track origin branch for first commit
        s.commit_origin.insert("c1".to_string(), "main".to_string());
        s
    }

    pub fn toggle_graph(&mut self) { self.ui.show_canvas = !self.ui.show_canvas; }

    pub fn sorted_branch_names(&self) -> Vec<String> {
        let mut v: Vec<String> = self.branches.keys().cloned().collect();
        v.sort();
        v
    }

    pub fn set_cursor_to_head(&mut self) {
        let name = self.cursor_branch.clone();
        if let Some(list) = self.branches.get(&name) {
            if !list.is_empty() { self.cursor_row = list.len()-1; }
        }
    }

    pub fn move_cursor_left(&mut self) {
        let names = self.sorted_branch_names();
        if let Some(idx) = names.iter().position(|n| n == &self.cursor_branch) {
            let new_idx = idx.saturating_sub(1);
            self.cursor_branch = names.get(new_idx).cloned().unwrap_or(self.cursor_branch.clone());
            self.set_cursor_to_head();
        }
    }
    pub fn move_cursor_right(&mut self) {
        let names = self.sorted_branch_names();
        if let Some(idx) = names.iter().position(|n| n == &self.cursor_branch) {
            let new_idx = (idx+1).min(names.len().saturating_sub(1));
            self.cursor_branch = names.get(new_idx).cloned().unwrap_or(self.cursor_branch.clone());
            self.set_cursor_to_head();
        }
    }
    pub fn move_cursor_up(&mut self) {
        self.cursor_row = self.cursor_row.saturating_sub(1);
    }
    pub fn move_cursor_down(&mut self) {
        if let Some(list) = self.branches.get(&self.cursor_branch) {
            if !list.is_empty() {
                self.cursor_row = (self.cursor_row+1).min(list.len()-1);
            }
        }
    }

    // Vertical log navigation (latest on top)
    pub fn log_up(&mut self) {
        if self.log_cursor > 0 { self.log_cursor -= 1; }
        else { self.log_scroll = self.log_scroll.saturating_sub(1); }
    }
    pub fn log_down(&mut self) {
        let total = self.commits.len();
        if self.log_scroll + self.log_cursor + 1 < total {
            if self.log_cursor + 1 < PAGE_SIZE { self.log_cursor += 1; }
            else { self.log_scroll += 1; }
        }
    }
    pub fn log_page_up(&mut self) { self.log_scroll = self.log_scroll.saturating_sub(PAGE_SIZE); }
    pub fn log_page_down(&mut self) {
        let total = self.commits.len();
        if self.log_scroll + PAGE_SIZE < total { self.log_scroll += PAGE_SIZE; }
    }

    pub fn current_head(&self, branch: &str) -> Option<String> {
        self.branches.get(branch).and_then(|v| v.last()).cloned()
    }

    pub fn snapshot(&mut self) {
        // Append a new commit to current branch
        let new_id = format!("c{}", self.commits.len() + 1);
        if let Some(head) = self.current_head(&self.current) {
            self.parents.insert(new_id.clone(), vec![head]);
        } else {
            self.parents.insert(new_id.clone(), vec![]);
        }
        self.commits.push(new_id.clone());
        self.branches.entry(self.current.clone()).or_default().push(new_id.clone());
        // Record origin branch for this commit
        self.commit_origin.insert(new_id.clone(), self.current.clone());
        // update cursor on current branch + vertical log
        self.cursor_branch = self.current.clone();
        self.set_cursor_to_head();
        self.log_scroll = 0; self.log_cursor = 0;
    }

    pub fn selected_commit_id(&self) -> Option<String> {
        // Latest on top; compute from log_scroll + log_cursor
        if self.commits.is_empty() { return None; }
        let total = self.commits.len();
        let idx_from_top = self.log_scroll + self.log_cursor;
        if idx_from_top >= total { return None; }
        let rev_index = idx_from_top; // 0 is latest
        let id = self.commits.iter().rev().nth(rev_index)?.clone();
        Some(id)
    }

    pub fn branch_from_selected(&mut self, name: Option<String>) {
        // Determine selected commit id
        let base_id = self.selected_commit_id();
        let new_name = name.unwrap_or_else(|| {
            let mut i = 2;
            loop {
                let n = format!("dev{}", i);
                if !self.branches.contains_key(&n) { break n; }
                i += 1;
            }
        });
        let mut list = Vec::new();
        if let Some(base) = base_id { list.push(base); }
        self.branches.insert(new_name.clone(), list);
        self.current = new_name.clone();
        self.cursor_branch = new_name;
        self.set_cursor_to_head();
    }

    pub fn checkout_selected(&mut self) {
        self.current = self.cursor_branch.clone();
        self.set_cursor_to_head();
    }

    pub fn delete_current_branch(&mut self) {
        if self.current == DEFAULT_BRANCH { return; }
        self.branches.remove(&self.current);
        self.current = DEFAULT_BRANCH.to_string();
        self.cursor_branch = self.current.clone();
        self.set_cursor_to_head();
    }

    pub fn insert(&mut self) {
        let nid = format!("N{}", self.nodes.len() + 1);
        let pending = self.current != "main";
        let branch = self.current.clone();
        
        self.nodes.push(Node {
            id: nid.clone(),
            label: format!("Node {}", self.nodes.len()),
            branch: branch.clone(),
            pending,
        });
        
        self.edges.push(Edge {
            from: "N1".to_string(),
            to: nid,
            rel: "KNOWS".to_string(),
            branch,
            pending,
        });
    }

    pub fn branch(&mut self, name: &str) {
        if !self.branches.contains_key(name) {
            let head = self.branches
                .get(&self.current)
                .and_then(|v| v.last())
                .cloned()
                .unwrap_or_else(|| "c1".to_string());
            self.branches.insert(name.to_string(), vec![head]);
        }
        self.current = name.to_string();
    }

    pub fn merge(&mut self) {
        if self.current == "main" { return; }
        let from = self.current.clone();
        let id = format!("m{}", self.commits.len() + 1);
        let head_main = self.current_head("main");
        let head_from = self.current_head(&from);
        let mut ps = Vec::new();
        if let Some(h) = head_main.clone() { ps.push(h); }
        if let Some(h) = head_from.clone() { ps.push(h); }
        self.parents.insert(id.clone(), ps);
        self.commits.push(id.clone());
        if let Some(main_commits) = self.branches.get_mut("main") {
            main_commits.push(id.clone());
        }
        // Merge commit belongs to main lane visually
        self.commit_origin.insert(id.clone(), "main".to_string());
        for node in &mut self.nodes {
            if node.pending { node.pending = false; node.branch = "main".to_string(); }
        }
        for edge in &mut self.edges {
            if edge.pending { edge.pending = false; edge.branch = "main".to_string(); }
        }
        self.last_merge_from = Some(from);
        self.current = "main".to_string();
        self.log_scroll = 0; self.log_cursor = 0;
    }

    pub fn recovery(&mut self) {
        let base = self.branches
            .get("main")
            .and_then(|v| v.get(1).or_else(|| v.last()))
            .cloned()
            .unwrap_or_else(|| "c1".to_string());
        if !self.branches.contains_key("recovery") {
            let id = format!("r{}", self.commits.len() + 1);
            self.commits.push(id);
            self.branches.insert("recovery".to_string(), vec![base, self.commits.last().unwrap().clone()]);
        }
        self.current = "recovery".to_string();
    }

    pub fn reset(&mut self) { *self = Self::new(); }
}

pub fn render(f: &mut Frame, state: &AppState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(95), // log
            Constraint::Percentage(5),  // help
        ])
        .split(f.area());

    git_like::render(f, chunks[0], state);
    render_help(f, chunks[1]);
}

fn render_help(f: &mut Frame, area: Rect) {
    use ratatui::widgets::Paragraph;
    use crate::theme::THEME;

    let txt = Line::from(vec![
        Span::styled("Keys: ", Style::default().bold().fg(THEME.text_primary)),
        Span::styled("↑/↓", Style::default().fg(THEME.accent).bold()),
        Span::raw(" cursor  "),
        Span::styled("PgUp/PgDn", Style::default().fg(THEME.accent).bold()),
        Span::raw(" scroll  "),
        Span::styled("s", Style::default().fg(THEME.accent).bold()),
        Span::raw("=snapshot  "),
        Span::styled("b/B", Style::default().fg(THEME.accent).bold()),
        Span::raw("=branch-from  "),
        Span::styled("c/C", Style::default().fg(THEME.accent).bold()),
        Span::raw("=checkout  "),
        Span::styled("m/M", Style::default().fg(THEME.accent).bold()),
        Span::raw("=merge  "),
        Span::styled("d/D", Style::default().fg(THEME.accent).bold()),
        Span::raw("=delete-branch  "),
        Span::styled("0", Style::default().fg(THEME.accent).bold()),
        Span::raw("=reset  "),
        Span::styled("e/E", Style::default().fg(THEME.accent).bold()),
        Span::raw("=export  "),
        Span::styled("q", Style::default().fg(THEME.accent).bold()),
        Span::raw("=quit"),
    ]);
    let p = Paragraph::new(vec![txt])
        .style(Style::default().fg(THEME.text_secondary));
    f.render_widget(p, area);
}
