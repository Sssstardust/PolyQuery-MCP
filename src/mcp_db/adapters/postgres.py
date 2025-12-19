"""PostgreSQL 数据库适配器"""

from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

from .base import DatabaseAdapter
from ..config import Config, DatabaseConfig


class PostgresAdapter(DatabaseAdapter):
    """PostgreSQL 适配器"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.conn = None
    
    def connect(self) -> None:
        if self.conn is None or self.conn.closed:
            self.conn = psycopg2.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                connect_timeout=Config.QUERY_TIMEOUT
            )
    
    def close(self) -> None:
        if self.conn and not self.conn.closed:
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
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            
            if cur.description:
                result = cur.fetchall()
                return [dict(row) for row in result[:limit]]
            else:
                self.conn.commit()
                return [{"affected_rows": cur.rowcount}]
    
    def get_schema_info(self) -> List[Dict[str, Any]]:
        query = """
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """
        return self.execute_query(query)
    
    def describe_table(self, table_name: str, schema_name: Optional[str] = None) -> List[Dict[str, Any]]:
        table_name = Config.validate_identifier(table_name)
        schema = Config.validate_identifier(schema_name) if schema_name else "public"
        
        query = f"""
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = '{schema}' AND table_name = '{table_name}'
            ORDER BY ordinal_position
        """
        return self.execute_query(query)
