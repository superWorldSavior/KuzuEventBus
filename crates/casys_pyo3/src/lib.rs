//! Casys Python SDK - pyo3 bindings (crates-first)

use pyo3::prelude::*;
use pyo3::types::PyDict;
use pyo3::exceptions::{PyRuntimeError, PyValueError};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

use ::casys_engine as engine;
use engine::types::{DatabaseName, BranchName};
use engine::index::{InMemoryGraphStore, GraphReadStore, GraphWriteStore};
use engine::exec::{parser, planner::Planner, executor::Executor, executor::Value};

/// Engine principal pour gérer les bases de données Casys
#[pyclass]
struct CasysEngine {
    inner: Arc<Mutex<engine::Engine>>,
    stores: Arc<Mutex<std::collections::HashMap<String, Arc<Mutex<InMemoryGraphStore>>>>>,
}

#[pymethods]
impl CasysEngine {
    #[new]
    fn new(data_dir: String) -> PyResult<Self> {
        let path = PathBuf::from(data_dir);
        let engine = engine::Engine::open(&path)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to open engine: {:?}", e)))?;
        
        Ok(Self {
            inner: Arc::new(Mutex::new(engine)),
            stores: Arc::new(Mutex::new(std::collections::HashMap::new())),
        })
    }
    
    fn open_database(&self, name: String) -> PyResult<String> {
        let mut engine = self.inner.lock().unwrap();
        let _db_handle = engine.open_database(&name)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to open database: {:?}", e)))?;
        
        Ok(name)
    }
    
    fn open_branch(&self, db_name: String, branch_name: String) -> PyResult<CasysBranch> {
        let mut engine = self.inner.lock().unwrap();
        let db_handle = engine.open_database(&db_name)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to open database: {:?}", e)))?;
        let _branch_handle = engine.open_branch(&db_handle, &branch_name)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to open branch: {:?}", e)))?;
        
        // Create or get store for this branch
        let key = format!("{}/{}", db_name, branch_name);
        let mut stores = self.stores.lock().unwrap();
        
        let store = stores.entry(key.clone()).or_insert_with(|| {
            Arc::new(Mutex::new(InMemoryGraphStore::new()))
        }).clone();
        
        Ok(CasysBranch {
            db_name,
            branch_name,
            store,
            engine: self.inner.clone(),
        })
    }
    
    fn create_branch(&self, db_name: String, branch_name: String) -> PyResult<()> {
        let mut engine = self.inner.lock().unwrap();
        let db_handle = engine.open_database(&db_name)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to open database: {:?}", e)))?;
        engine.create_branch(&db_handle, "main", &branch_name, None)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to create branch: {:?}", e)))?;
        
        Ok(())
    }
    
    #[cfg(feature = "fs")]
    fn list_snapshots(&self, db_name: String, branch_name: String, py: Python) -> PyResult<PyObject> {
        use casys_storage_fs::manifest as mf;
        
        let engine = self.inner.lock().unwrap();
        let db = DatabaseName::try_from(db_name.as_str())
            .map_err(|e| PyRuntimeError::new_err(format!("Invalid database name: {:?}", e)))?;
        let branch = BranchName::try_from(branch_name.as_str())
            .map_err(|e| PyRuntimeError::new_err(format!("Invalid branch name: {:?}", e)))?;
        
        let paths = mf::list_manifest_paths(engine.data_dir(), &db, &branch)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to list manifests: {:?}", e)))?;
        
        let mut snapshots: Vec<PyObject> = Vec::new();
        for path in paths {
            if let Ok(manifest) = mf::read_manifest(&path) {
                let dict = pyo3::types::PyDict::new(py);
                dict.set_item("timestamp", manifest.version_ts)?;
                dict.set_item("segments_count", manifest.segments.len())?;
                dict.set_item("branch", manifest.branch)?;
                snapshots.push(dict.into());
            }
        }
        
        Ok(snapshots.into_py(py))
    }

    #[cfg(not(feature = "fs"))]
    fn list_snapshots(&self, _db_name: String, _branch_name: String, _py: Python) -> PyResult<PyObject> {
        Err(PyRuntimeError::new_err("list_snapshots() requires the 'fs' feature. Rebuild casys_pyo3 with --features fs."))
    }
}

/// Branch (branche) dans une database Casys
#[pyclass]
struct CasysBranch {
    db_name: String,
    branch_name: String,
    store: Arc<Mutex<InMemoryGraphStore>>,
    engine: Arc<Mutex<engine::Engine>>,
}

#[pymethods]
impl CasysBranch {
    #[pyo3(signature = (gql, params=None))]
    fn query(&self, gql: String, params: Option<Py<PyDict>>, py: Python) -> PyResult<PyObject> {
        // Parse la requête GQL
        let ast = parser::parse(&gql)
            .map_err(|e| PyValueError::new_err(format!("Parse error: {:?}", e)))?;
        if std::env::var("CASYS_DEBUG_PLAN").ok().as_deref() == Some("1") {
            println!("AST create_clause present? {}", ast.create_clause.is_some());
        }
        
        // Extract required parameters from AST
        let required_params = ast.extract_parameters();
        
        // Planifie l'exécution
        let plan = Planner::plan(&ast)
            .map_err(|e| PyRuntimeError::new_err(format!("Planning error: {:?}", e)))?;
        if std::env::var("CASYS_DEBUG_PLAN").ok().as_deref() == Some("1") {
            use engine::exec::planner::PlanNode;
            let kind = match &plan.root {
                PlanNode::Create { .. } => "Create",
                PlanNode::MatchCreate { .. } => "MatchCreate",
                PlanNode::Filter { .. } => "Filter",
                PlanNode::Project { .. } => "Project",
                PlanNode::OrderBy { .. } => "OrderBy",
                PlanNode::Aggregate { .. } => "Aggregate",
                PlanNode::Limit { .. } => "Limit",
                PlanNode::Expand { .. } => "Expand",
                PlanNode::CartesianProduct { .. } => "CartesianProduct",
                PlanNode::LabelScan { .. } => "LabelScan",
                PlanNode::FullScan { .. } => "FullScan",
            };
            println!("PLAN ROOT: {}", kind);
        }
        
        // Convert params to HashMap<String, Value>
        let mut parameters = std::collections::HashMap::new();
        if let Some(params_dict) = params {
            for (k, v) in params_dict.as_ref(py).iter() {
                let key = k.to_string();
                let value = py_to_value(v)?;
                parameters.insert(key, value);
            }
        }
        
        // Validate that all required parameters are provided
        for required_param in &required_params {
            if !parameters.contains_key(required_param) {
                return Err(PyValueError::new_err(format!(
                    "Required parameter ${} is not provided. Query parameters: {:?}",
                    required_param,
                    required_params
                )));
            }
        }
        
        // Exécute
        let mut store = self.store.lock().unwrap();
        // If CREATE is present, route through write handle and no explicit read handle (Option B)
        let result = if ast.create_clause.is_some() {
            let mut write: Option<&mut dyn GraphWriteStore> = Some(&mut *store);
            let executor = if parameters.is_empty() {
                Executor::new_no_read()
            } else {
                Executor::with_parameters_no_read(parameters)
            };
            executor.execute(&plan, write)
        } else {
            // Read-only path: use explicit read store and no write handle
            let read = &*store as &dyn GraphReadStore;
            let executor = if parameters.is_empty() {
                Executor::new(read)
            } else {
                Executor::with_parameters(read, parameters)
            };
            executor.execute(&plan, None)
        }
            .map_err(|e| PyRuntimeError::new_err(format!("Execution error: {:?}", e)))?;
        
        // Convert to Python dict
        let dict = PyDict::new(py);
        
        // Columns
        let cols: Vec<String> = result.columns.iter().map(|c| c.name.clone()).collect();
        dict.set_item("columns", cols)?;
        
        // Rows
        let rows: Vec<Vec<serde_json::Value>> = result.rows;
        let py_rows: Vec<PyObject> = rows.iter().map(|row| {
            row.iter().map(|v| json_to_py(py, v)).collect::<Vec<_>>().into_py(py)
        }).collect();
        dict.set_item("rows", py_rows)?;

        // Stats (if available)
        if let Some(stats) = result.stats {
            let s = PyDict::new(py);
            s.set_item("elapsed_ms", stats.elapsed_ms)?;
            s.set_item("scanned", stats.scanned)?;
            s.set_item("expanded", stats.expanded)?;
            dict.set_item("stats", s)?;
        }
        
        Ok(dict.into())
    }
    
    #[cfg(feature = "fs")]
    fn flush(&self) -> PyResult<()> {
        let db = DatabaseName::try_from(self.db_name.as_str())
            .map_err(|e| PyValueError::new_err(format!("Invalid database name: {:?}", e)))?;
        let branch = BranchName::try_from(self.branch_name.as_str())
            .map_err(|e| PyValueError::new_err(format!("Invalid branch name: {:?}", e)))?;
        
        let engine = self.engine.lock().unwrap();
        let store = self.store.lock().unwrap();
        
        // Flush to segments
        store.flush_to_segments(engine.data_dir(), &db, &branch)
            .map_err(|e| PyRuntimeError::new_err(format!("Flush error: {:?}", e)))?;
        
        Ok(())
    }
    
    #[cfg(not(feature = "fs"))]
    fn flush(&self) -> PyResult<()> {
        Err(PyRuntimeError::new_err("flush() requires the 'fs' feature. Rebuild casys_pyo3 with --features fs."))
    }
    
    #[cfg(feature = "fs")]
    fn load(&self) -> PyResult<()> {
        let db = DatabaseName::try_from(self.db_name.as_str())
            .map_err(|e| PyValueError::new_err(format!("Invalid database name: {:?}", e)))?;
        let branch = BranchName::try_from(self.branch_name.as_str())
            .map_err(|e| PyValueError::new_err(format!("Invalid branch name: {:?}", e)))?;
        
        let engine = self.engine.lock().unwrap();
        
        // Load from segments
        let loaded_store = InMemoryGraphStore::load_from_segments(engine.data_dir(), &db, &branch)
            .map_err(|e| PyRuntimeError::new_err(format!("Load error: {:?}", e)))?;
        
        let mut store = self.store.lock().unwrap();
        *store = loaded_store;
        
        Ok(())
    }
    
    #[cfg(not(feature = "fs"))]
    fn load(&self) -> PyResult<()> {
        Err(PyRuntimeError::new_err("load() requires the 'fs' feature. Rebuild casys_pyo3 with --features fs."))
    }
    
    fn add_node(&self, labels: Vec<String>, properties: Py<PyDict>, py: Python) -> PyResult<u64> {
        let mut store = self.store.lock().unwrap();
        
        // Convert Python dict to HashMap<String, Value>
        let mut props = std::collections::HashMap::new();
        for (k, v) in properties.as_ref(py).iter() {
            let key = k.to_string();
            let value = py_to_value(v)?;
            props.insert(key, value);
        }
        
        let node_id = store.add_node(labels, props)
            .map_err(|e| PyRuntimeError::new_err(format!("Add node error: {:?}", e)))?;
        
        Ok(node_id)
    }
    
    fn add_edge(&self, from_id: u64, to_id: u64, edge_type: String, properties: Py<PyDict>, py: Python) -> PyResult<u64> {
        let mut store = self.store.lock().unwrap();
        
        // Convert Python dict to HashMap<String, Value>
        let mut props = std::collections::HashMap::new();
        for (k, v) in properties.as_ref(py).iter() {
            let key = k.to_string();
            let value = py_to_value(v)?;
            props.insert(key, value);
        }
        
        let edge_id = store.add_edge(from_id, to_id, edge_type, props)
            .map_err(|e| PyRuntimeError::new_err(format!("Add edge error: {:?}", e)))?;
        
        Ok(edge_id)
    }
}

/// Convert Python object to Value
fn py_to_value(obj: &PyAny) -> PyResult<Value> {
    if obj.is_none() {
        Ok(Value::Null)
    } else if let Ok(b) = obj.extract::<bool>() {
        Ok(Value::Bool(b))
    } else if let Ok(i) = obj.extract::<i64>() {
        Ok(Value::Int(i))
    } else if let Ok(f) = obj.extract::<f64>() {
        Ok(Value::Float(f))
    } else if let Ok(s) = obj.extract::<String>() {
        Ok(Value::String(s))
    } else {
        Err(PyValueError::new_err("Unsupported Python type for Value conversion"))
    }
}

/// Convert serde_json::Value to Python object
fn json_to_py(py: Python, val: &serde_json::Value) -> PyObject {
    match val {
        serde_json::Value::Null => py.None(),
        serde_json::Value::Bool(b) => b.into_py(py),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                i.into_py(py)
            } else if let Some(f) = n.as_f64() {
                f.into_py(py)
            } else {
                py.None()
            }
        }
        serde_json::Value::String(s) => s.into_py(py),
        serde_json::Value::Array(arr) => {
            let py_list: Vec<PyObject> = arr.iter().map(|v| json_to_py(py, v)).collect();
            py_list.into_py(py)
        }
        serde_json::Value::Object(obj) => {
            let dict = PyDict::new(py);
            for (k, v) in obj {
                let _ = dict.set_item(k, json_to_py(py, v));
            }
            dict.into()
        }
    }
}

/// Module Python Casys Engine (native bindings)
#[pymodule]
fn casys_engine(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<CasysEngine>()?;
    m.add_class::<CasysBranch>()?;
    Ok(())
}
