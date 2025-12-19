#!/usr/bin/env python3
"""
PolyQuery MCP Server - 多数据库查询工具
支持 PostgreSQL、MySQL、MongoDB、Redis、Oracle
"""

import asyncio
import json
import logging
import re
import time
from typing import Any
from concurrent.futures import ThreadPoolExecutor

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import CallToolResult, TextContent, Tool

from .config import Config
from .factory import AdapterFactory, get_adapter

# 配置日志
logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL))
logger = logging.getLogger(__name__)

# MCP服务器
server = Server("polyquery-mcp-server")

# 线程池
executor = ThreadPoolExecutor(max_workers=10)


def sanitize_error(error: str) -> str:
    """清理错误信息，避免泄露敏感信息"""
    error = re.sub(r'://[^@]+@', '://***:***@', error)
    error = re.sub(r'[A-Za-z]:\\[^\s]+', '[path]', error)
    return error


def format_result(data: Any, execution_time: float = None) -> str:
    """格式化返回结果"""
    result = {
        "success": True,
        "data": data,
        "row_count": len(data) if isinstance(data, list) else 1
    }
    if execution_time:
        result["execution_time_ms"] = round(execution_time * 1000, 2)
    return json.dumps(result, default=str, ensure_ascii=False, indent=2)


def format_error(error: str) -> str:
    """格式化错误结果"""
    return json.dumps({
        "success": False,
        "error": sanitize_error(error)
    }, ensure_ascii=False, indent=2)


# ==================== MCP 工具定义 ====================

@server.list_tools()
async def list_tools():
    """列出所有可用工具"""
    return [
        Tool(
            name="query_database",
            description="执行数据库查询。SQL数据库传SQL语句，MongoDB传JSON查询，Redis传命令字符串",
            inputSchema={
                "type": "object",
                "properties": {
                    "db_type": {
                        "type": "string",
                        "enum": ["postgres", "mysql", "mongodb", "redis", "oracle"],
                        "description": "数据库类型"
                    },
                    "query": {
                        "type": "string",
                        "description": "查询语句。SQL/Redis命令/MongoDB JSON"
                    },
                    "limit": {
                        "type": "integer",
                        "description": f"返回行数限制，默认{Config.MAX_ROWS}",
                        "default": Config.MAX_ROWS
                    }
                },
                "required": ["db_type", "query"]
            }
        ),
        Tool(
            name="list_tables",
            description="列出数据库中的所有表/集合",
            inputSchema={
                "type": "object",
                "properties": {
                    "db_type": {
                        "type": "string",
                        "enum": ["postgres", "mysql", "mongodb", "redis", "oracle"],
                        "description": "数据库类型"
                    }
                },
                "required": ["db_type"]
            }
        ),
        Tool(
            name="describe_table",
            description="获取表/集合的结构信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "db_type": {
                        "type": "string",
                        "enum": ["postgres", "mysql", "mongodb", "redis", "oracle"],
                        "description": "数据库类型"
                    },
                    "table_name": {
                        "type": "string",
                        "description": "表名/集合名/Redis key"
                    },
                    "schema_name": {
                        "type": "string",
                        "description": "Schema名（可选）"
                    }
                },
                "required": ["db_type", "table_name"]
            }
        ),
        Tool(
            name="test_connection",
            description="测试数据库连接",
            inputSchema={
                "type": "object",
                "properties": {
                    "db_type": {
                        "type": "string",
                        "enum": ["postgres", "mysql", "mongodb", "redis", "oracle"],
                        "description": "数据库类型"
                    }
                },
                "required": ["db_type"]
            }
        ),
        Tool(
            name="list_databases",
            description="列出所有已配置的数据库及状态",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


# ==================== 工具实现 ====================

def _query_database_sync(db_type: str, query: str, limit: int) -> dict:
    """同步执行数据库查询"""
    start_time = time.time()
    adapter = get_adapter(db_type)
    result = adapter.execute_query(query, limit=limit)
    execution_time = time.time() - start_time
    return {"data": result, "execution_time": execution_time}


def _list_tables_sync(db_type: str) -> list:
    """同步获取表列表"""
    adapter = get_adapter(db_type)
    return adapter.get_schema_info()


def _describe_table_sync(db_type: str, table_name: str, schema_name: str = None) -> list:
    """同步获取表结构"""
    adapter = get_adapter(db_type)
    return adapter.describe_table(table_name, schema_name)


def _test_connection_sync(db_type: str) -> dict:
    """同步测试连接"""
    start_time = time.time()
    try:
        adapter = get_adapter(db_type)
        success = adapter.test_connection()
        return {
            "success": success,
            "db_type": db_type,
            "response_time_ms": round((time.time() - start_time) * 1000, 2)
        }
    except Exception as e:
        return {
            "success": False,
            "db_type": db_type,
            "error": sanitize_error(str(e))
        }


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> CallToolResult:
    """处理工具调用"""
    loop = asyncio.get_event_loop()
    
    try:
        logger.info(f"调用工具: {name}, 参数: {arguments}")
        
        if name == "query_database":
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    executor,
                    lambda: _query_database_sync(
                        arguments["db_type"],
                        arguments["query"],
                        arguments.get("limit", Config.MAX_ROWS)
                    )
                ),
                timeout=Config.QUERY_TIMEOUT
            )
            return CallToolResult(content=[TextContent(
                type="text",
                text=format_result(result["data"], result["execution_time"])
            )])
        
        elif name == "list_tables":
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    executor,
                    lambda: _list_tables_sync(arguments["db_type"])
                ),
                timeout=Config.QUERY_TIMEOUT
            )
            return CallToolResult(content=[TextContent(
                type="text",
                text=format_result(result)
            )])
        
        elif name == "describe_table":
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    executor,
                    lambda: _describe_table_sync(
                        arguments["db_type"],
                        arguments["table_name"],
                        arguments.get("schema_name")
                    )
                ),
                timeout=Config.QUERY_TIMEOUT
            )
            return CallToolResult(content=[TextContent(
                type="text",
                text=format_result(result)
            )])
        
        elif name == "test_connection":
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    executor,
                    lambda: _test_connection_sync(arguments["db_type"])
                ),
                timeout=Config.QUERY_TIMEOUT
            )
            return CallToolResult(content=[TextContent(
                type="text",
                text=json.dumps(result, ensure_ascii=False, indent=2)
            )])
        
        elif name == "list_databases":
            configured = AdapterFactory.list_configured_databases()
            databases = [
                {"type": db, "configured": status}
                for db, status in configured.items()
            ]
            return CallToolResult(content=[TextContent(
                type="text",
                text=format_result(databases)
            )])
        
        else:
            raise ValueError(f"未知工具: {name}")
    
    except asyncio.TimeoutError:
        logger.error(f"工具 {name} 执行超时")
        return CallToolResult(
            content=[TextContent(type="text", text=format_error(f"查询超时（{Config.QUERY_TIMEOUT}秒）"))],
            isError=True
        )
    except Exception as e:
        logger.error(f"执行工具 {name} 出错: {str(e)}")
        return CallToolResult(
            content=[TextContent(type="text", text=format_error(str(e)))],
            isError=True
        )


# ==================== 服务器启动 ====================

async def run_server():
    """运行MCP服务器"""
    async with stdio_server() as (read_stream, write_stream):
        init_options = server.create_initialization_options()
        logger.info(f"PolyQuery MCP Server 启动，只读模式: {Config.READ_ONLY_MODE}")
        await server.run(read_stream, write_stream, init_options)


def main():
    """入口函数"""
    try:
        asyncio.run(run_server())
    finally:
        AdapterFactory.close_all()


if __name__ == "__main__":
    main()
