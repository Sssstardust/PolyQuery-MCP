"""数据库适配器工厂 - 单例模式管理连接"""

from typing import Dict, Optional
from .config import Config
from .adapters.base import DatabaseAdapter


class AdapterFactory:
    """适配器工厂 - 单例模式复用连接"""
    
    _instances: Dict[str, DatabaseAdapter] = {}
    
    @classmethod
    def get_adapter(cls, db_type: str) -> DatabaseAdapter:
        """
        获取数据库适配器实例（单例）
        
        Args:
            db_type: 数据库类型 (postgres/mysql/mongodb/redis/oracle)
            
        Returns:
            对应的数据库适配器实例
        """
        db_type = db_type.lower()
        
        # 如果已有实例，直接返回
        if db_type in cls._instances:
            return cls._instances[db_type]
        
        # 创建新实例
        adapter = cls._create_adapter(db_type)
        cls._instances[db_type] = adapter
        return adapter
    
    @classmethod
    def _create_adapter(cls, db_type: str) -> DatabaseAdapter:
        """创建适配器实例（延迟导入驱动）"""
        if db_type == "postgres" or db_type == "postgresql":
            config = Config.get_postgres_config()
            if not config:
                raise ValueError("POSTGRES_URL 环境变量未配置")
            from .adapters.postgres import PostgresAdapter
            return PostgresAdapter(config)
        
        elif db_type == "mysql":
            config = Config.get_mysql_config()
            if not config:
                raise ValueError("MYSQL_URL 环境变量未配置")
            from .adapters.mysql import MySQLAdapter
            return MySQLAdapter(config)
        
        elif db_type == "mongodb" or db_type == "mongo":
            config = Config.get_mongodb_config()
            if not config:
                raise ValueError("MONGODB_URL 环境变量未配置")
            from .adapters.mongodb import MongoDBAdapter
            return MongoDBAdapter(config)
        
        elif db_type == "redis":
            config = Config.get_redis_config()
            if not config:
                raise ValueError("REDIS_URL 环境变量未配置")
            from .adapters.redis import RedisAdapter
            return RedisAdapter(config)
        
        elif db_type == "oracle":
            config = Config.get_oracle_config()
            if not config:
                raise ValueError("ORACLE_URL 环境变量未配置")
            from .adapters.oracle import OracleAdapter
            return OracleAdapter(config)
        
        else:
            raise ValueError(f"不支持的数据库类型: {db_type}")
    
    @classmethod
    def list_configured_databases(cls) -> Dict[str, bool]:
        """列出所有已配置的数据库"""
        return {
            "postgres": Config.get_postgres_config() is not None,
            "mysql": Config.get_mysql_config() is not None,
            "mongodb": Config.get_mongodb_config() is not None,
            "redis": Config.get_redis_config() is not None,
            "oracle": Config.get_oracle_config() is not None,
        }
    
    @classmethod
    def close_all(cls) -> None:
        """关闭所有连接"""
        for adapter in cls._instances.values():
            try:
                adapter.close()
            except Exception:
                pass
        cls._instances.clear()


# 便捷函数
def get_adapter(db_type: str) -> DatabaseAdapter:
    """获取数据库适配器"""
    return AdapterFactory.get_adapter(db_type)
