"""MySQL 数据库适配器"""

from typing import Any, Dict, List, Optional
import pymysql
from pymysql.cursors import DictCursor

from .base import DatabaseAdapter
from ..config import Config, DatabaseConfig


class MySQLAdapter(DatabaseAdapter):
    """MySQL 适配器"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.conn = None
    
    def connect(self) -> None:
        if self.conn is None:
            self.conn = pymysql.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                connect_timeout=Config.QUERY_TIMEOUT,
                cursorclass=DictCursor
            )
    
    def close(self) -> None:
        if self.conn:
            self.conn.close()
            self.conn = None
    
    def test_connection(self) -> bool:
        try:
            self.connect()
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
            return True
        except Exception:
            return False
    
    def execute_query(self, query: str, params: Optional[List] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        # 安全验证
        is_safe, error_msg = Config.validate_sql_query(query)
        if not is_safe:
            raise ValueError(error_msg)
        
        self.connect()
        
        # 自动添加LIMIT
        if "LIMIT" not in query.upper() and query.strip().upper().startswith("SELECT"):
            query = f"{query.rstrip(';')} LIMIT {limit}"
        
        with self.conn.cursor() as cur:
            cur.execute(query, params or ())
            
            if cur.description:
                result = cur.fetchall()
                return list(result[:limit])
            else:
                self.conn.commit()
                return [{"affected_rows": cur.rowcount}]
    
    def get_schema_info(self) -> List[Dict[str, Any]]:
        return self.execute_query("SHOW TABLES")
    
    def describe_table(self, table_name: str, schema_name: Optional[str] = None) -> List[Dict[str, Any]]:
        table_name = Config.validate_identifier(table_name)
        return self.execute_query(f"DESCRIBE `{table_name}`")
