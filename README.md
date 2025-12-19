# PolyQuery MCP

[![npm version](https://badge.fury.io/js/polyquery-mcp.svg)](https://badge.fury.io/js/polyquery-mcp)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个支持多种数据库的 MCP (Model Context Protocol) 服务器，让 AI 助手能够安全地查询和探索数据库。

支持 **MySQL** | **PostgreSQL** | **MongoDB** | **Redis** | **Oracle**

## 🚀 快速开始

### 安装
```bash
npm install -g polyquery-mcp
```

### 配置 MCP 客户端

在 Claude Desktop 或 Cursor 等 MCP 客户端中添加配置：

```json
{
  "mcpServers": {
    "polyquery": {
      "command": "polyquery-mcp",
      "env": {
        "MYSQL_URL": "mysql://user:pass@localhost:3306/mydb",
        "POSTGRES_URL": "postgresql://username:password@localhost:5432/database",
        "MONGODB_URL": "mongodb://username:password@localhost:27017/database",
        "REDIS_URL": "redis://:password@localhost:6379/0",
        "ORACLE_URL": "oracle://username:password@localhost:1521/ORCL",
        "READ_ONLY_MODE": "true",
        "MAX_ROWS": "1000",
        "QUERY_TIMEOUT": "30000",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

或者使用 npx：

```json
{
  "mcpServers": {
    "polyquery": {
      "command": "npx",
      "args": ["-y", "polyquery-mcp"],
      "env": {
        "MYSQL_URL": "mysql://user:pass@localhost:3306/mydb"
      }
    }
  }
}
```

## 📝 配置说明

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
| `READ_ONLY_MODE` | `true` | 只读模式，禁止 INSERT/UPDATE/DELETE |
| `MAX_ROWS` | `1000` | 查询返回的最大行数 |
| `QUERY_TIMEOUT` | `30000` | 查询超时时间（毫秒） |

## 🔧 可用工具

| 工具 | 说明 |
|------|------|
| `query_database` | 执行数据库查询 |
| `list_tables` | 列出所有表/集合 |
| `describe_table` | 获取表结构信息 |
| `test_connection` | 测试数据库连接 |
| `list_databases` | 列出已配置的数据库 |

## 💡 使用示例

### SQL 数据库
```
"查询 users 表中年龄大于 18 的用户"
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

- ✅ 默认只读模式，禁止写操作 INSERT/UPDATE/DELETE
- ✅ 自动添加 LIMIT 防止返回过多数据
- ✅ 查询超时保护
- ✅ SQL 注入防护
- ✅ 敏感信息脱敏

## 🛠 本地开发

```bash
git clone https://github.com/yourusername/polyquery-mcp.git
cd polyquery-mcp
npm install
npm run build
```

## 🤝 贡献
欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
