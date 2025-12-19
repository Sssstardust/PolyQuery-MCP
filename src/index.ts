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

// 閸掓稑缂?MCP Server
const server = new Server(
  { name: 'polyquery-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 瀹搞儱鍙跨€规矮绠?const tools: Tool[] = [
  {
    name: 'query_database',
    description: '閹笛嗩攽閺佺増宓佹惔鎾寸叀鐠囶潿鈧總QL閺佺増宓佹惔鎾茬炊SQL鐠囶厼褰為敍瀛ngoDB娴肩嚒SON閺屻儴顕楅敍瀛痚dis娴肩姴鎳℃禒銈呯摟缁楋缚瑕?,
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: ['mysql', 'postgres', 'mongodb', 'redis', 'oracle'],
          description: '閺佺増宓佹惔鎾惰閸?
        },
        query: {
          type: 'string',
          description: '閺屻儴顕楃拠顓炲綖閵嗕總QL/Redis閸涙垝鎶?MongoDB JSON'
        },
        limit: {
          type: 'number',
          description: `鏉╂柨娲栫悰灞炬殶闂勬劕鍩楅敍宀勭帛鐠?{Config.MAX_ROWS}`,
          default: Config.MAX_ROWS
        }
      },
      required: ['db_type', 'query']
    }
  },
  {
    name: 'list_tables',
    description: '閸掓鍤弫鐗堝祦鎼存挷鑵戦惃鍕閺堝銆?闂嗗棗鎮?,
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: ['mysql', 'postgres', 'mongodb', 'redis', 'oracle'],
          description: '閺佺増宓佹惔鎾惰閸?
        }
      },
      required: ['db_type']
    }
  },
  {
    name: 'describe_table',
    description: '閼惧嘲褰囩悰?闂嗗棗鎮庨惃鍕波閺嬪嫪淇婇幁?,
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: ['mysql', 'postgres', 'mongodb', 'redis', 'oracle'],
          description: '閺佺増宓佹惔鎾惰閸?
        },
        table_name: {
          type: 'string',
          description: '鐞涖劌鎮?闂嗗棗鎮庨崥?Redis key'
        },
        schema_name: {
          type: 'string',
          description: 'Schema閸氬稄绱欓崣顖炩偓澶涚礆'
        }
      },
      required: ['db_type', 'table_name']
    }
  },
  {
    name: 'test_connection',
    description: '濞村鐦弫鐗堝祦鎼存捁绻涢幒?,
    inputSchema: {
      type: 'object',
      properties: {
        db_type: {
          type: 'string',
          enum: ['mysql', 'postgres', 'mongodb', 'redis', 'oracle'],
          description: '閺佺増宓佹惔鎾惰閸?
        }
      },
      required: ['db_type']
    }
  },
  {
    name: 'list_databases',
    description: '閸掓鍤幍鈧張澶婂嚒闁板秶鐤嗛惃鍕殶閹诡喖绨遍崣濠勫Ц閹?,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// 濞夈劌鍞藉銉ュ徔閸掓銆冩径鍕倞閸?
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

// 濞夈劌鍞藉銉ュ徔鐠嬪啰鏁ゆ径鍕倞閸?
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
        throw new Error(`閺堫亞鐓″銉ュ徔: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };

  } catch (error: any) {
    // 濞撳懐鎮婇柨娆掝嚖娣団剝浼呮稉顓犳畱閺佸繑鍔呮穱鈩冧紖
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

// 閸氼垰濮╅張宥呭閸?
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`PolyQuery MCP Server started (read-only: ${Config.READ_ONLY_MODE})`);
}

// 娴兼﹢娉ら柅鈧崙?
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
