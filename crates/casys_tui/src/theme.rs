use ratatui::style::Color;

pub struct Theme {
    pub text_primary: Color,
    pub text_secondary: Color,
    pub text_muted: Color,
    pub accent: Color,
    pub border: Color,
    pub bg: Color,
    // Branch palette
    pub main: Color,
    pub dev: Color,
    pub recovery: Color,
}

impl Theme {
    pub fn branch_color(&self, branch: &str, pending: bool) -> Color {
        if pending { return self.text_muted; }
        match branch {
            "main" => self.main,
            "dev" => self.dev,
            "recovery" => self.recovery,
            _ => self.accent,
        }
    }
}

pub const THEME: Theme = Theme {
    text_primary: Color::White,
    text_secondary: Color::Gray,
    text_muted: Color::DarkGray,
    accent: Color::Magenta,
    border: Color::Gray,
    bg: Color::Black,
    main: Color::Cyan,
    dev: Color::Magenta,
    recovery: Color::Yellow,
};
