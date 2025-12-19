"""数据库适配器模块 - 延迟导入"""

from .base import DatabaseAdapter

# 延迟导入，避免未安装的驱动导致启动失败
def get_postgres_adapter():
    from .postgres import PostgresAdapter
    return PostgresAdapter

def get_mysql_adapter():
    from .mysql import MySQLAdapter
    return MySQLAdapter

def get_mongodb_adapter():
    from .mongodb import MongoDBAdapter
    return MongoDBAdapter

def get_redis_adapter():
    from .redis import RedisAdapter
    return RedisAdapter

def get_oracle_adapter():
    from .oracle import OracleAdapter
    return OracleAdapter

__all__ = [
    "DatabaseAdapter",
    "get_postgres_adapter",
    "get_mysql_adapter",
    "get_mongodb_adapter",
    "get_redis_adapter",
    "get_oracle_adapter",
]
