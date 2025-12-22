#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Config } from './config';
import { getAdapter, listConfiguredDatabases, closeAllAdapters } from './factory';

// 创建 MCP Server
const server = new Server(
  { name: 'polyquery-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 支持的数据库类型
const DB_TYPES = ['mysql', 'postgres', 'mongodb', 'redis', 'oracle', 'sqlite'] as const;

// 工具定义
const tools: Tool[] = [
  {
    name: 'query_database',
    description: '执行数据库查询。SQL数据库传SQL语句，MongoDB传JSON查询，Redis传命令字符串',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: DB_TYPES,
          description: '数据库类型'
        },
        query: {
          type: 'string',
          description: '查询语句。SQL/Redis命令/MongoDB JSON'
        },
        limit: {
          type: 'number',
          description: `返回行数限制，默认${Config.MAX_ROWS}`,
          default: Config.MAX_ROWS
        }
      },
      required: ['db_type', 'query']
    }
  },
  {
    name: 'list_tables',
    description: '列出数据库中的所有表/集合',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: DB_TYPES,
          description: '数据库类型'
        }
      },
      required: ['db_type']
    }
  },
  {
    name: 'describe_table',
    description: '获取表/集合的结构信息',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: DB_TYPES,
          description: '数据库类型'
        },
        table_name: {
          type: 'string',
          description: '表名/集合名/Redis key'
        },
        schema_name: {
          type: 'string',
          description: 'Schema名（可选）'
        }
      },
      required: ['db_type', 'table_name']
    }
  },
  {
    name: 'test_connection',
    description: '测试数据库连接',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: DB_TYPES,
          description: '数据库类型'
        }
      },
      required: ['db_type']
    }
  },
  {
    name: 'list_databases',
    description: '列出所有已配置的数据库及状态',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: any;
    const startTime = Date.now();

    switch (name) {
      case 'query_database': {
        const adapter = getAdapter(args.db_type as string);
        const data = await adapter.executeQuery(
          args.query as string,
          undefined,
          (args.limit as number) || Config.MAX_ROWS
        );
        result = {
          success: true,
          data,
          row_count: data.length,
          execution_time_ms: Date.now() - startTime
        };
        break;
      }

      case 'list_tables': {
        const adapter = getAdapter(args.db_type as string);
        const tables = await adapter.getSchemaInfo();
        result = {
          success: true,
          data: tables,
          row_count: tables.length
        };
        break;
      }

      case 'describe_table': {
        const adapter = getAdapter(args.db_type as string);
        const columns = await adapter.describeTable(
          args.table_name as string,
          args.schema_name as string | undefined
        );
        result = {
          success: true,
          data: columns,
          row_count: columns.length
        };
        break;
      }

      case 'test_connection': {
        const adapter = getAdapter(args.db_type as string);
        const success = await adapter.testConnection();
        result = {
          success,
          db_type: args.db_type,
          response_time_ms: Date.now() - startTime
        };
        break;
      }

      case 'list_databases': {
        const configured = listConfiguredDatabases();
        result = {
          success: true,
          data: Object.entries(configured).map(([type, status]) => ({
            type,
            configured: status
          }))
        };
        break;
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };

  } catch (error: any) {
    // 清理错误信息中的敏感信息
    let errorMsg = error.message || String(error);
    errorMsg = errorMsg.replace(/\/\/[^@]+@/g, '//***:***@');

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: false, error: errorMsg }, null, 2)
      }],
      isError: true
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`PolyQuery MCP Server started (read-only: ${Config.READ_ONLY_MODE})`);
}

// 优雅退出
process.on('SIGINT', async () => {
  await closeAllAdapters();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeAllAdapters();
  process.exit(0);
});

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
