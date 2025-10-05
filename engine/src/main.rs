use axum::{routing::{get, post}, Router, Json};
use serde_json::{json, Value};
use std::{env, net::SocketAddr};
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

async fn health() -> Json<Value> {
    Json(json!({"status": "ok"}))
}

async fn root() -> Json<Value> {
    Json(json!({"service": "cassis", "version": env!("CARGO_PKG_VERSION")}))
}

async fn gql() -> (axum::http::StatusCode, Json<Value>) {
    (axum::http::StatusCode::NOT_IMPLEMENTED, Json(json!({"error": "GQL endpoint not implemented (skeleton)"})))
}

#[tokio::main]
async fn main() {
    // Logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let port: u16 = env::var("ENGINE_PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(9400);

    let app = Router::new()
        .route("/health", get(health))
        .route("/gql", post(gql))
        .route("/", get(root));

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Starting engine on {}", addr);

    let listener = TcpListener::bind(addr).await.expect("bind failed");
    axum::serve(listener, app)
        .await
        .expect("server failed");
}
