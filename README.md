# PolyQuery MCP

[![PyPI version](https://badge.fury.io/py/polyquery-mcp.svg)](https://badge.fury.io/py/polyquery-mcp)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个支持多种数据库的 MCP (Model Context Protocol) 查询工具，让 AI 助手能够直接查询你的数据库。

支持：**PostgreSQL** | **MySQL** | **MongoDB** | **Redis** | **Oracle**

## 🚀 快速开始

### 安装

```bash
# 安装核心包
pip install polyquery-mcp

# 按需安装数据库驱动
pip install polyquery-mcp[mysql]      # MySQL
pip install polyquery-mcp[postgres]   # PostgreSQL
pip install polyquery-mcp[mongodb]    # MongoDB
pip install polyquery-mcp[redis]      # Redis
pip install polyquery-mcp[oracle]     # Oracle
pip install polyquery-mcp[all]        # 全部
```

### 配置 MCP 客户端

在 Claude Desktop、Cursor 或其他 MCP 客户端中添加配置：

```json
{
  "mcpServers": {
    "polyquery": {
      "command": "polyquery-mcp",
      "env": {
        "MYSQL_URL": "mysql://user:pass@localhost:3306/mydb",
        "READ_ONLY_MODE": "true"
      }
    }
  }
}
```

就这么简单！现在你可以用自然语言查询数据库了。

## 📖 配置说明

### 数据库连接 URL

| 数据库 | 环境变量 | 格式 |
|--------|----------|------|
| MySQL | `MYSQL_URL` | `mysql://user:pass@host:3306/db` |
| PostgreSQL | `POSTGRES_URL` | `postgresql://user:pass@host:5432/db` |
| MongoDB | `MONGODB_URL` | `mongodb://user:pass@host:27017/db` |
| Redis | `REDIS_URL` | `redis://:password@host:6379/0` |
| Oracle | `ORACLE_URL` | `oracle://user:pass@host:1521/service` |

### 安全配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `READ_ONLY_MODE` | `true` | 只读模式，禁止写操作 |
| `MAX_ROWS` | `1000` | 最大返回行数 |
| `QUERY_TIMEOUT` | `30` | 查询超时（秒） |

## 🛠 可用工具

| 工具 | 说明 |
|------|------|
| `query_database` | 执行数据库查询 |
| `list_tables` | 列出所有表/集合 |
| `describe_table` | 获取表结构 |
| `test_connection` | 测试数据库连接 |
| `list_databases` | 列出已配置的数据库 |

## 💡 使用示例

### SQL 数据库
```
"帮我查询 users 表中年龄大于 18 的用户"
→ query_database(db_type="mysql", query="SELECT * FROM users WHERE age > 18")
```

### MongoDB
```
"查询 orders 集合中状态为 pending 的订单"
→ query_database(db_type="mongodb", query='{"collection":"orders","filter":{"status":"pending"}}')
```

### Redis
```
"获取 user:123 的所有字段"
→ query_database(db_type="redis", query="HGETALL user:123")
```

## 🔒 安全特性

- ✅ 默认只读模式，禁止 INSERT/UPDATE/DELETE
- ✅ 自动添加 LIMIT 限制，防止返回过多数据
- ✅ 查询超时保护
- ✅ SQL 注入防护
- ✅ 错误信息脱敏

## 📦 从源码安装

```bash
git clone https://github.com/yourusername/polyquery-mcp.git
cd polyquery-mcp
pip install -e ".[all]"
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
