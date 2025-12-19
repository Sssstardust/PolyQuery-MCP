"""Oracle 数据库适配器"""

from typing import Any, Dict, List, Optional
import oracledb

from .base import DatabaseAdapter
from ..config import Config, DatabaseConfig


class OracleAdapter(DatabaseAdapter):
    """Oracle 适配器 (使用 python-oracledb Thin 模式)"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.conn = None
    
    def connect(self) -> None:
        if self.conn is None:
            # 使用 Thin 模式，不需要 Oracle Client
            self.conn = oracledb.connect(
                user=self.config.user,
                password=self.config.password,
                host=self.config.host,
                port=self.config.port,
                service_name=self.config.database
            )
    
    def close(self) -> None:
        if self.conn:
            self.conn.close()
            self.conn = None
    
    def test_connection(self) -> bool:
        try:
            self.connect()
            with self.conn.cursor() as cur:
                cur.execute("SELECT 1 FROM DUAL")
                cur.fetchone()
            return True
        except Exception:
            return False
    
    def execute_query(self, query: str, params: Optional[Dict] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        # 安全验证
        is_safe, error_msg = Config.validate_sql_query(query)
        if not is_safe:
            raise ValueError(error_msg)
        
        self.connect()
        
        # Oracle 使用 ROWNUM 或 FETCH FIRST 限制行数
        if ("ROWNUM" not in query.upper() and 
            "FETCH" not in query.upper() and 
            query.strip().upper().startswith("SELECT")):
            query = f"SELECT * FROM ({query.rstrip(';')}) WHERE ROWNUM <= {limit}"
        
        with self.conn.cursor() as cur:
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)
            
            if cur.description:
                columns = [col[0] for col in cur.description]
                rows = cur.fetchall()
                return [dict(zip(columns, row)) for row in rows[:limit]]
            else:
                self.conn.commit()
                return [{"affected_rows": cur.rowcount}]
    
    def get_schema_info(self) -> List[Dict[str, Any]]:
        query = "SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME"
        return self.execute_query(query)
    
    def describe_table(self, table_name: str, schema_name: Optional[str] = None) -> List[Dict[str, Any]]:
        table_name = Config.validate_identifier(table_name)
        
        if schema_name:
            schema_name = Config.validate_identifier(schema_name)
            query = f"""
                SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, DATA_DEFAULT, DATA_LENGTH
                FROM ALL_TAB_COLUMNS
                WHERE TABLE_NAME = '{table_name.upper()}' AND OWNER = '{schema_name.upper()}'
                ORDER BY COLUMN_ID
            """
        else:
            query = f"""
                SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, DATA_DEFAULT, DATA_LENGTH
                FROM USER_TAB_COLUMNS
                WHERE TABLE_NAME = '{table_name.upper()}'
                ORDER BY COLUMN_ID
            """
        
        return self.execute_query(query)
