use std::convert::TryFrom;

pub type Timestamp = u64; // epoch millis (MVP)

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct DatabaseName(String);

impl TryFrom<&str> for DatabaseName {
    type Error = EngineError;
    fn try_from(value: &str) -> Result<Self, Self::Error> {
        validate_identifier(value)?;
        Ok(Self(value.to_string()))
    }
}

impl DatabaseName {
    pub fn as_str(&self) -> &str { &self.0 }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct BranchName(String);

impl TryFrom<&str> for BranchName {
    type Error = EngineError;
    fn try_from(value: &str) -> Result<Self, Self::Error> {
        validate_identifier(value)?;
        Ok(Self(value.to_string()))
    }
}

impl BranchName {
    pub fn as_str(&self) -> &str { &self.0 }
}

#[derive(Clone, Debug)]
pub struct GqlQuery(pub String);

#[derive(Clone, Debug)]
pub struct ColumnMeta {
    pub name: String,
    pub r#type: String,
}

#[derive(Clone, Debug)]
pub struct QueryStats {
    pub elapsed_ms: u64,
    pub scanned: u64,
    pub expanded: u64,
}

#[derive(Clone, Debug)]
pub struct QueryResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub stats: Option<QueryStats>,
}

#[derive(thiserror::Error, Debug)]
pub enum EngineError {
    #[error("storage io: {0}")]
    StorageIo(String),
    #[error("invalid argument: {0}")]
    InvalidArgument(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("concurrency error: {0}")]
    Concurrency(String),
    #[error("not implemented: {0}")]
    NotImplemented(String),
}

fn validate_identifier(s: &str) -> Result<(), EngineError> {
    if s.is_empty() || s.len() > 128 {
        return Err(EngineError::InvalidArgument("identifier length".into()));
    }
    if !s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' ) {
        return Err(EngineError::InvalidArgument("identifier charset".into()));
    }
    Ok(())
}
