"""MongoDB 数据库适配器"""

import json
from typing import Any, Dict, List, Optional
from pymongo import MongoClient
from bson import ObjectId

from .base import DatabaseAdapter
from ..config import Config, DatabaseConfig


class MongoDBAdapter(DatabaseAdapter):
    """MongoDB 适配器"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.client = None
        self.db = None
    
    def connect(self) -> None:
        if self.client is None:
            if self.config.connection_string:
                # mongodb+srv:// 连接
                self.client = MongoClient(
                    self.config.connection_string,
                    serverSelectionTimeoutMS=Config.QUERY_TIMEOUT * 1000
                )
            else:
                connect_params = {
                    "host": self.config.host,
                    "port": self.config.port,
                    "serverSelectionTimeoutMS": Config.QUERY_TIMEOUT * 1000
                }
                if self.config.user:
                    connect_params["username"] = self.config.user
                    connect_params["password"] = self.config.password
                self.client = MongoClient(**connect_params)
            
            self.db = self.client[self.config.database]
    
    def close(self) -> None:
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
    
    def test_connection(self) -> bool:
        try:
            self.connect()
            self.client.admin.command("ping")
            return True
        except Exception:
            return False
    
    def _convert_objectid(self, obj: Any) -> Any:
        """递归转换ObjectId为字符串"""
        if isinstance(obj, dict):
            return {k: self._convert_objectid(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_objectid(item) for item in obj]
        elif isinstance(obj, ObjectId):
            return str(obj)
        return obj
    
    def execute_query(
        self,
        query: str,
        params: Optional[Dict] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        执行MongoDB查询
        
        query格式: JSON字符串，包含以下字段:
        - collection: 集合名称 (必需)
        - operation: 操作类型 find/find_one/count/distinct/aggregate (默认find)
        - filter: 查询条件 (默认{})
        - projection: 字段投影
        - sort: 排序条件
        - skip: 跳过数量
        """
        self.connect()
        
        # 解析查询参数
        try:
            query_obj = json.loads(query) if isinstance(query, str) else query
        except json.JSONDecodeError:
            raise ValueError("MongoDB查询必须是有效的JSON格式")
        
        collection_name = query_obj.get("collection")
        if not collection_name:
            raise ValueError("必须指定collection")
        
        operation = query_obj.get("operation", "find")
        filter_query = query_obj.get("filter", {})
        projection = query_obj.get("projection")
        sort = query_obj.get("sort")
        skip = query_obj.get("skip", 0)
        
        coll = self.db[collection_name]
        
        if operation == "find":
            cursor = coll.find(filter_query, projection)
            if sort:
                cursor = cursor.sort(list(sort.items()))
            cursor = cursor.skip(skip).limit(limit)
            result = [self._convert_objectid(doc) for doc in cursor]
        
        elif operation == "find_one":
            doc = coll.find_one(filter_query, projection)
            result = [self._convert_objectid(doc)] if doc else []
        
        elif operation == "count":
            count = coll.count_documents(filter_query)
            result = [{"count": count}]
        
        elif operation == "distinct":
            field = query_obj.get("field", "_id")
            values = coll.distinct(field, filter_query)
            result = [{"field": field, "values": values}]
        
        elif operation == "aggregate":
            pipeline = query_obj.get("pipeline", [])
            pipeline.append({"$limit": limit})
            result = [self._convert_objectid(doc) for doc in coll.aggregate(pipeline)]
        
        else:
            raise ValueError(f"不支持的操作类型: {operation}")
        
        return result
    
    def get_schema_info(self) -> List[Dict[str, Any]]:
        self.connect()
        collections = self.db.list_collection_names()
        return [{"collection": name} for name in collections]
    
    def describe_table(self, table_name: str, schema_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取集合的字段信息（通过采样文档推断）"""
        self.connect()
        coll = self.db[table_name]
        
        # 采样一个文档来推断结构
        sample = coll.find_one()
        if not sample:
            return [{"message": "集合为空，无法推断结构"}]
        
        fields = []
        for key, value in sample.items():
            fields.append({
                "field": key,
                "type": type(value).__name__,
                "sample_value": str(value)[:100] if value else None
            })
        
        return fields
