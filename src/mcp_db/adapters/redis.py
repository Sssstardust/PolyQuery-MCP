"""Redis 数据库适配器"""

import shlex
from typing import Any, Dict, List, Optional
import redis

from .base import DatabaseAdapter
from ..config import Config, DatabaseConfig


class RedisAdapter(DatabaseAdapter):
    """Redis 适配器"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.client = None
    
    def connect(self) -> None:
        if self.client is None:
            self.client = redis.Redis(
                host=self.config.host,
                port=self.config.port,
                password=self.config.password,
                db=int(self.config.database or 0),
                socket_timeout=Config.QUERY_TIMEOUT,
                decode_responses=False  # 不自动解码，手动处理
            )
    
    def close(self) -> None:
        if self.client:
            self.client.close()
            self.client = None
    
    def test_connection(self) -> bool:
        try:
            self.connect()
            self.client.ping()
            return True
        except Exception:
            return False
    
    def execute_query(self, query: str, params: Optional[List] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        执行Redis命令
        
        query格式: "COMMAND arg1 arg2 ..." 或 "COMMAND"
        例如: "GET mykey", "HGETALL user:1", "KEYS *"
        """
        self.connect()
        
        # 解析命令
        try:
            parts = shlex.split(query)
        except ValueError:
            parts = query.split()
        
        if not parts:
            raise ValueError("Redis命令不能为空")
        
        command = parts[0].upper()
        args = parts[1:] if len(parts) > 1 else []
        
        # 安全验证
        is_safe, error_msg = Config.validate_redis_command(command)
        if not is_safe:
            raise ValueError(error_msg)
        
        # 执行命令
        redis_method = getattr(self.client, command.lower(), None)
        if redis_method and callable(redis_method):
            result = redis_method(*args)
        else:
            result = self.client.execute_command(command, *args)
        
        # 格式化结果
        return self._format_result(command, result)
    
    def _safe_decode(self, value: Any) -> Any:
        """安全解码bytes，处理非UTF-8数据"""
        if isinstance(value, bytes):
            try:
                return value.decode("utf-8")
            except UnicodeDecodeError:
                # 非UTF-8数据，返回十六进制表示
                return f"<binary:{value.hex()[:32]}...>" if len(value) > 16 else f"<binary:{value.hex()}>"
        return value
    
    def _format_result(self, command: str, result: Any) -> List[Dict[str, Any]]:
        """格式化Redis返回结果"""
        if result is None:
            return [{"value": None}]
        
        if isinstance(result, (str, int, float)):
            return [{"value": result}]
        
        if isinstance(result, bytes):
            return [{"value": self._safe_decode(result)}]
        
        if isinstance(result, list):
            # KEYS, LRANGE 等返回列表
            return [{"index": i, "value": self._safe_decode(v)} for i, v in enumerate(result)]
        
        if isinstance(result, dict):
            # HGETALL 返回字典
            return [{"key": self._safe_decode(k), "value": self._safe_decode(v)} for k, v in result.items()]
        
        if isinstance(result, set):
            return [{"value": self._safe_decode(v)} for v in result]
        
        return [{"value": str(result)}]
    
    def get_schema_info(self) -> List[Dict[str, Any]]:
        """获取Redis数据库信息"""
        self.connect()
        
        info = self.client.info("keyspace")
        db_info = []
        
        for db_name, stats in info.items():
            if isinstance(stats, dict):
                db_info.append({
                    "database": db_name,
                    "keys": stats.get("keys", 0),
                    "expires": stats.get("expires", 0)
                })
        
        # 如果没有keyspace信息，返回当前数据库的key数量
        if not db_info:
            db_size = self.client.dbsize()
            db_info.append({
                "database": f"db{self.config.database or 0}",
                "keys": db_size
            })
        
        return db_info
    
    def describe_table(self, table_name: str, schema_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取指定key的类型和内容"""
        self.connect()
        
        key_type = self.client.type(table_name)
        ttl = self.client.ttl(table_name)
        
        result = {
            "key": table_name,
            "type": key_type,
            "ttl": ttl if ttl >= 0 else "no expiry"
        }
        
        # 根据类型获取部分内容
        if key_type == "string":
            result["value"] = self.client.get(table_name)
        elif key_type == "list":
            result["length"] = self.client.llen(table_name)
            result["sample"] = self.client.lrange(table_name, 0, 9)
        elif key_type == "hash":
            result["fields"] = self.client.hlen(table_name)
            result["sample"] = dict(list(self.client.hgetall(table_name).items())[:10])
        elif key_type == "set":
            result["members"] = self.client.scard(table_name)
            result["sample"] = list(self.client.srandmember(table_name, 10) or [])
        elif key_type == "zset":
            result["members"] = self.client.zcard(table_name)
            result["sample"] = self.client.zrange(table_name, 0, 9, withscores=True)
        
        return [result]
