"""数据库适配器抽象基类"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class DatabaseAdapter(ABC):
    """数据库适配器接口"""
    
    @abstractmethod
    def connect(self) -> None:
        """建立数据库连接"""
        pass
    
    @abstractmethod
    def close(self) -> None:
        """关闭数据库连接"""
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """测试连接是否正常"""
        pass
    
    @abstractmethod
    def execute_query(self, query: str, params: Optional[Any] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        执行查询
        
        Args:
            query: 查询语句（SQL/命令/JSON）
            params: 查询参数
            limit: 返回行数限制
            
        Returns:
            查询结果列表
        """
        pass
    
    @abstractmethod
    def get_schema_info(self) -> List[Dict[str, Any]]:
        """获取数据库结构信息（表/集合列表）"""
        pass
    
    @abstractmethod
    def describe_table(self, table_name: str, schema_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取表/集合结构详情"""
        pass
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
