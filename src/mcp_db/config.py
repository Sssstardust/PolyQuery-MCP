"""配置管理模块 - 从环境变量加载数据库配置"""

import os
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


@dataclass
class DatabaseConfig:
    """数据库配置"""
    host: str = "localhost"
    port: int = 0
    user: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None
    # MongoDB Atlas 等使用完整连接字符串
    connection_string: Optional[str] = None


class Config:
    """全局配置"""
    
    # 安全配置
    READ_ONLY_MODE: bool = os.getenv("READ_ONLY_MODE", "true").lower() == "true"
    MAX_ROWS: int = int(os.getenv("MAX_ROWS", "1000"))
    QUERY_TIMEOUT: int = int(os.getenv("QUERY_TIMEOUT", "30"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # 危险SQL关键字（只读模式下禁止）
    DANGEROUS_KEYWORDS = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
        'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE',
        'CALL', 'SHUTDOWN', 'KILL'
    ]
    
    # Redis写入命令黑名单
    REDIS_WRITE_COMMANDS = [
        'SET', 'DEL', 'EXPIRE', 'HSET', 'HDEL', 'LPUSH', 'RPUSH', 'LPOP', 'RPOP',
        'SADD', 'SREM', 'ZADD', 'ZREM', 'FLUSHDB', 'FLUSHALL', 'RENAME', 'COPY',
        'APPEND', 'SETEX', 'SETNX', 'MSET', 'INCR', 'DECR', 'INCRBY', 'DECRBY'
    ]
    
    @classmethod
    def get_postgres_config(cls) -> Optional[DatabaseConfig]:
        """获取PostgreSQL配置"""
        url = os.getenv("POSTGRES_URL")
        if not url:
            return None
        return cls._parse_sql_url(url, default_port=5432)
    
    @classmethod
    def get_mysql_config(cls) -> Optional[DatabaseConfig]:
        """获取MySQL配置"""
        url = os.getenv("MYSQL_URL")
        if not url:
            return None
        return cls._parse_sql_url(url, default_port=3306)
    
    @classmethod
    def get_mongodb_config(cls) -> Optional[DatabaseConfig]:
        """获取MongoDB配置"""
        url = os.getenv("MONGODB_URL")
        if not url:
            return None
        
        parsed = urlparse(url)
        
        # mongodb+srv:// 使用完整连接字符串
        if parsed.scheme == "mongodb+srv":
            return DatabaseConfig(
                connection_string=url,
                database=parsed.path.lstrip("/").split("?")[0] or "test"
            )
        
        if parsed.scheme == "mongodb" and parsed.hostname:
            return DatabaseConfig(
                host=parsed.hostname,
                port=parsed.port or 27017,
                user=unquote(parsed.username) if parsed.username else None,
                password=unquote(parsed.password) if parsed.password else None,
                database=parsed.path.lstrip("/").split("?")[0] or "test"
            )
        return None
    
    @classmethod
    def get_redis_config(cls) -> Optional[DatabaseConfig]:
        """获取Redis配置"""
        url = os.getenv("REDIS_URL")
        if not url:
            return None
        
        # 使用正则解析，避免特殊字符问题
        # 格式: redis://[:password@]host:port[/db]
        pattern = r'^redis://(?::([^@]*)@)?([^:]+):(\d+)(?:/(\d+))?$'
        match = re.match(pattern, url)
        if match:
            password = match.group(1)
            host = match.group(2)
            port = int(match.group(3))
            db = int(match.group(4)) if match.group(4) else 0
            return DatabaseConfig(
                host=host,
                port=port,
                password=password,
                database=str(db)
            )
        
        # 兼容标准URL格式（无特殊字符）
        parsed = urlparse(url)
        if parsed.scheme == "redis" and parsed.hostname:
            db = 0
            if parsed.path:
                try:
                    db = int(parsed.path.lstrip("/"))
                except ValueError:
                    pass
            return DatabaseConfig(
                host=parsed.hostname,
                port=parsed.port or 6379,
                password=parsed.password if parsed.password else None,
                database=str(db)
            )
        return None
    
    @classmethod
    def get_oracle_config(cls) -> Optional[DatabaseConfig]:
        """获取Oracle配置"""
        url = os.getenv("ORACLE_URL")
        if not url:
            return None
        
        # oracle://user:password@host:port/service_name
        pattern = r'oracle://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
        match = re.match(pattern, url)
        if match:
            return DatabaseConfig(
                user=match.group(1),
                password=match.group(2),
                host=match.group(3),
                port=int(match.group(4)),
                database=match.group(5)  # service_name
            )
        return None
    
    @classmethod
    def _parse_sql_url(cls, url: str, default_port: int) -> Optional[DatabaseConfig]:
        """解析SQL数据库URL"""
        parsed = urlparse(url)
        if parsed.hostname:
            return DatabaseConfig(
                host=parsed.hostname,
                port=parsed.port or default_port,
                user=unquote(parsed.username) if parsed.username else None,
                password=unquote(parsed.password) if parsed.password else None,
                database=parsed.path.lstrip("/") or None
            )
        return None
    
    @classmethod
    def validate_sql_query(cls, query: str) -> tuple[bool, str]:
        """验证SQL查询安全性"""
        if not cls.READ_ONLY_MODE:
            return True, ""
        
        # 移除注释
        clean_query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
        clean_query = re.sub(r'/\*.*?\*/', '', clean_query, flags=re.DOTALL)
        clean_query = clean_query.strip().upper()
        
        for keyword in cls.DANGEROUS_KEYWORDS:
            if re.search(rf'\b{keyword}\b', clean_query):
                return False, f"只读模式下禁止使用 {keyword} 语句"
        
        return True, ""
    
    @classmethod
    def validate_redis_command(cls, command: str) -> tuple[bool, str]:
        """验证Redis命令安全性"""
        if not cls.READ_ONLY_MODE:
            return True, ""
        
        if command.upper() in cls.REDIS_WRITE_COMMANDS:
            return False, f"只读模式下禁止使用 {command} 命令"
        
        return True, ""
    
    @classmethod
    def validate_identifier(cls, name: str) -> str:
        """验证数据库标识符（表名、schema名）"""
        if not name:
            return name
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
            raise ValueError(f"无效的标识符: {name}")
        return name
