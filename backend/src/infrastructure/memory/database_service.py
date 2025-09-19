"""
Simple in-memory database management service for YAGNI approach.

Provides basic database management operations with comprehensive logging.
"""
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from src.domain.shared.ports.tenant_management import CustomerAccountRepository
from src.domain.shared.ports.database_management import KuzuDatabaseRepository, FileStorageService, KuzuQueryService
from src.domain.shared.ports.authentication import AuthorizationService
from src.domain.shared.ports.notifications import NotificationService
from src.domain.shared.ports.cache import CacheService
from src.infrastructure.logging.config import infra_logger, get_logger

# Get dedicated logger for database service
db_service_logger = get_logger("database_service")


class SimpleDatabaseInfo:
    """Simple database information holder."""
    
    def __init__(self, db_id: str, name: str, tenant_id: UUID, description: Optional[str] = None):
        self.id = db_id
        self.name = name
        self.tenant_id = tenant_id
        self.description = description
        self.status = "active"
        self.created_at = datetime.utcnow()
        self.size_bytes = 0
        self.last_accessed = datetime.utcnow()
        

class SimpleInMemoryDatabaseService:
    """
    Simple in-memory database management service for YAGNI.
    
    📊 Strategic logging for:
    - Performance monitoring
    - Resource usage tracking
    - Business metrics
    - Security auditing
    """
    
    def __init__(
        self,
        customer_repository: CustomerAccountRepository,
        database_repository: Optional[KuzuDatabaseRepository] = None,
        file_storage: Optional[FileStorageService] = None,
        query_service: Optional[KuzuQueryService] = None,
        auth_service: Optional[AuthorizationService] = None,
        notification_service: Optional[NotificationService] = None,
        cache_service: Optional[CacheService] = None,
    ):
        self._customer_repository = customer_repository
        self._database_repository = database_repository
        self._file_storage = file_storage
        self._query_service = query_service
        self._auth_service = auth_service
        self._notification_service = notification_service
        self._cache_service = cache_service
        
        # In-memory storage for YAGNI
        self._databases: Dict[str, SimpleDatabaseInfo] = {}
        self._tenant_databases: Dict[str, List[str]] = {}  # tenant_id -> [db_ids]
        
        db_service_logger.info("🚀 Database management service initialized (YAGNI mode)")
    
    async def create_database(
        self, tenant_id: UUID, database_name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new database for tenant.
        
        📊 Logs: Performance, quotas, business metrics
        """
        start_time = time.time()
        tenant_str = str(tenant_id)
        
        db_service_logger.info(
            f"🛠️  Database creation started",
            extra={
                "operation": "create_database",
                "tenant_id": tenant_str,
                "database_name": database_name,
                "description": description,
                "start_time": start_time
            }
        )
        
        try:
            # Check if database name already exists for tenant
            existing_dbs = self._tenant_databases.get(tenant_str, [])
            for db_id in existing_dbs:
                if self._databases[db_id].name == database_name:
                    db_service_logger.warning(
                        f"⚠️  Database creation failed - name already exists",
                        extra={
                            "operation": "create_database",
                            "tenant_id": tenant_str,
                            "database_name": database_name,
                            "conflict": "name_already_exists",
                            "existing_database_id": db_id
                        }
                    )
                    raise ValueError(f"Database '{database_name}' already exists")
            
            # Generate database ID
            db_id = f"db_{uuid4().hex[:8]}"
            
            # Create database info
            db_info = SimpleDatabaseInfo(
                db_id=db_id,
                name=database_name,
                tenant_id=tenant_id,
                description=description
            )
            
            # Store in memory
            self._databases[db_id] = db_info
            if tenant_str not in self._tenant_databases:
                self._tenant_databases[tenant_str] = []
            self._tenant_databases[tenant_str].append(db_id)
            
            processing_time = time.time() - start_time
            
            # Log successful creation with business metrics
            db_service_logger.info(
                f"✅ Database created successfully",
                extra={
                    "operation": "create_database",
                    "tenant_id": tenant_str,
                    "database_id": db_id,
                    "database_name": database_name,
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "success",
                    "business_metrics": {
                        "tenant_database_count": len(self._tenant_databases[tenant_str]),
                        "total_databases": len(self._databases),
                        "storage_allocated_bytes": db_info.size_bytes
                    }
                }
            )
            
            # Return database information
            return {
                "id": db_id,
                "name": database_name,
                "description": description,
                "status": db_info.status,
                "created_at": db_info.created_at.isoformat(),
                "size_bytes": db_info.size_bytes,
                "tenant_id": tenant_str
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            db_service_logger.error(
                f"❌ Database creation failed",
                extra={
                    "operation": "create_database",
                    "tenant_id": tenant_str,
                    "database_name": database_name,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "error"
                },
                exc_info=True
            )
            raise
    
    async def list_databases(self, tenant_id: UUID) -> List[Dict[str, Any]]:
        """
        List all databases for tenant.
        
        📊 Logs: Access patterns, performance, resource usage
        """
        start_time = time.time()
        tenant_str = str(tenant_id)
        
        db_service_logger.info(
            f"📋 Database listing started",
            extra={
                "operation": "list_databases",
                "tenant_id": tenant_str,
                "start_time": start_time
            }
        )
        
        try:
            # Get tenant databases
            tenant_db_ids = self._tenant_databases.get(tenant_str, [])
            databases = []
            total_size = 0
            
            for db_id in tenant_db_ids:
                if db_id in self._databases:
                    db_info = self._databases[db_id]
                    # Update last accessed
                    db_info.last_accessed = datetime.utcnow()
                    
                    databases.append({
                        "id": db_info.id,
                        "name": db_info.name,
                        "description": db_info.description,
                        "status": db_info.status,
                        "created_at": db_info.created_at.isoformat(),
                        "size_bytes": db_info.size_bytes,
                        "tenant_id": tenant_str,
                        "last_accessed": db_info.last_accessed.isoformat()
                    })
                    total_size += db_info.size_bytes
            
            processing_time = time.time() - start_time
            
            db_service_logger.info(
                f"✅ Database listing completed",
                extra={
                    "operation": "list_databases",
                    "tenant_id": tenant_str,
                    "database_count": len(databases),
                    "total_size_bytes": total_size,
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "success",
                    "performance_metrics": {
                        "avg_processing_time_per_db_ms": round(processing_time * 1000 / max(1, len(databases)), 2),
                        "cache_hit_rate": 100.0  # All in memory for YAGNI
                    }
                }
            )
            
            return databases
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            db_service_logger.error(
                f"❌ Database listing failed",
                extra={
                    "operation": "list_databases",
                    "tenant_id": tenant_str,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "error"
                },
                exc_info=True
            )
            raise
    
    async def get_database_info(
        self, tenant_id: UUID, database_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed database information.
        
        📊 Logs: Access patterns, security checks, performance
        """
        start_time = time.time()
        tenant_str = str(tenant_id)
        
        db_service_logger.info(
            f"🔍 Database info requested",
            extra={
                "operation": "get_database_info",
                "tenant_id": tenant_str,
                "database_id": database_id,
                "start_time": start_time
            }
        )
        
        try:
            # Check if database exists
            if database_id not in self._databases:
                db_service_logger.warning(
                    f"⚠️  Database not found",
                    extra={
                        "operation": "get_database_info",
                        "tenant_id": tenant_str,
                        "database_id": database_id,
                        "result": "not_found"
                    }
                )
                return None
            
            db_info = self._databases[database_id]
            
            # Security check: ensure database belongs to tenant
            if str(db_info.tenant_id) != tenant_str:
                db_service_logger.warning(
                    f"🚨 SECURITY: Unauthorized database access attempt",
                    extra={
                        "operation": "get_database_info",
                        "requesting_tenant_id": tenant_str,
                        "database_owner_tenant_id": str(db_info.tenant_id),
                        "database_id": database_id,
                        "security_violation": "unauthorized_access_attempt"
                    }
                )
                return None
            
            # Update access time
            db_info.last_accessed = datetime.utcnow()
            
            processing_time = time.time() - start_time
            
            db_service_logger.info(
                f"✅ Database info retrieved",
                extra={
                    "operation": "get_database_info",
                    "tenant_id": tenant_str,
                    "database_id": database_id,
                    "database_name": db_info.name,
                    "database_size_bytes": db_info.size_bytes,
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "success"
                }
            )
            
            return {
                "id": db_info.id,
                "name": db_info.name,
                "description": db_info.description,
                "status": db_info.status,
                "created_at": db_info.created_at.isoformat(),
                "size_bytes": db_info.size_bytes,
                "tenant_id": tenant_str,
                "last_accessed": db_info.last_accessed.isoformat()
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            db_service_logger.error(
                f"❌ Database info retrieval failed",
                extra={
                    "operation": "get_database_info",
                    "tenant_id": tenant_str,
                    "database_id": database_id,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "error"
                },
                exc_info=True
            )
            raise
    
    async def delete_database(self, tenant_id: UUID, database_id: str) -> bool:
        """
        Delete a database and all its data.
        
        📊 Logs: Data destruction audit, compliance, security
        """
        start_time = time.time()
        tenant_str = str(tenant_id)
        
        db_service_logger.warning(
            f"🗑️  Database deletion initiated - DESTRUCTIVE OPERATION",
            extra={
                "operation": "delete_database",
                "tenant_id": tenant_str,
                "database_id": database_id,
                "severity": "HIGH",
                "data_loss_risk": True,
                "start_time": start_time
            }
        )
        
        try:
            # Check if database exists
            if database_id not in self._databases:
                db_service_logger.warning(
                    f"⚠️  Database deletion failed - not found",
                    extra={
                        "operation": "delete_database",
                        "tenant_id": tenant_str,
                        "database_id": database_id,
                        "result": "not_found"
                    }
                )
                return False
            
            db_info = self._databases[database_id]
            
            # Security check: ensure database belongs to tenant
            if str(db_info.tenant_id) != tenant_str:
                db_service_logger.error(
                    f"🚨 SECURITY: Unauthorized database deletion attempt",
                    extra={
                        "operation": "delete_database",
                        "requesting_tenant_id": tenant_str,
                        "database_owner_tenant_id": str(db_info.tenant_id),
                        "database_id": database_id,
                        "security_violation": "unauthorized_deletion_attempt",
                        "severity": "CRITICAL"
                    }
                )
                return False
            
            # Store info for audit before deletion
            deleted_db_info = {
                "id": db_info.id,
                "name": db_info.name,
                "size_bytes": db_info.size_bytes,
                "created_at": db_info.created_at.isoformat(),
                "tenant_id": tenant_str
            }
            
            # Remove from storage
            del self._databases[database_id]
            if tenant_str in self._tenant_databases:
                self._tenant_databases[tenant_str].remove(database_id)
                if not self._tenant_databases[tenant_str]:
                    del self._tenant_databases[tenant_str]
            
            processing_time = time.time() - start_time
            
            db_service_logger.warning(
                f"🗑️  Database deleted successfully",
                extra={
                    "operation": "delete_database",
                    "tenant_id": tenant_str,
                    "database_id": database_id,
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "success",
                    "deleted_database": deleted_db_info,
                    "compliance": {
                        "audit_logged": True,
                        "data_retention_policy": "immediate_deletion",  # YAGNI - no backups
                        "gdpr_compliant": True
                    },
                    "business_impact": {
                        "remaining_databases": len(self._tenant_databases.get(tenant_str, [])),
                        "freed_storage_bytes": deleted_db_info["size_bytes"]
                    }
                }
            )
            
            return True
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            db_service_logger.error(
                f"❌ Database deletion failed - DATA MAY BE INCONSISTENT",
                extra={
                    "operation": "delete_database",
                    "tenant_id": tenant_str,
                    "database_id": database_id,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "processing_time_ms": round(processing_time * 1000, 2),
                    "result": "error",
                    "severity": "CRITICAL"
                },
                exc_info=True
            )
            raise
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics for monitoring."""
        total_databases = len(self._databases)
        total_tenants = len(self._tenant_databases)
        total_size = sum(db.size_bytes for db in self._databases.values())
        
        return {
            "total_databases": total_databases,
            "total_tenants": total_tenants,
            "total_size_bytes": total_size,
            "avg_databases_per_tenant": round(total_databases / max(1, total_tenants), 2),
            "service_type": "SimpleInMemoryDatabaseService",
            "yagni_mode": True
        }