import { Config } from './config';
import { DatabaseAdapter } from './adapters/base';

// 适配器缓存（单例模式）
const adapterCache: Map<string, DatabaseAdapter> = new Map();

export function getAdapter(dbType: string): DatabaseAdapter {
  const type = dbType.toLowerCase();
  
  // 检查缓存
  if (adapterCache.has(type)) {
    return adapterCache.get(type)!;
  }

  // 创建新适配器
  const adapter = createAdapter(type);
  adapterCache.set(type, adapter);
  return adapter;
}

function createAdapter(dbType: string): DatabaseAdapter {
  switch (dbType) {
    case 'mysql': {
      const config = Config.getMysqlConfig();
      if (!config) throw new Error('MYSQL_URL 环境变量未配置');
      const { MySQLAdapter } = require('./adapters/mysql');
      return new MySQLAdapter(config);
    }

    case 'postgres':
    case 'postgresql': {
      const config = Config.getPostgresConfig();
      if (!config) throw new Error('POSTGRES_URL 环境变量未配置');
      const { PostgresAdapter } = require('./adapters/postgres');
      return new PostgresAdapter(config);
    }

    case 'mongodb':
    case 'mongo': {
      const config = Config.getMongodbConfig();
      if (!config) throw new Error('MONGODB_URL 环境变量未配置');
      const { MongoDBAdapter } = require('./adapters/mongodb');
      return new MongoDBAdapter(config);
    }

    case 'redis': {
      const config = Config.getRedisConfig();
      if (!config) throw new Error('REDIS_URL 环境变量未配置');
      const { RedisAdapter } = require('./adapters/redis');
      return new RedisAdapter(config);
    }

    case 'oracle': {
      const config = Config.getOracleConfig();
      if (!config) throw new Error('ORACLE_URL 环境变量未配置');
      const { OracleAdapter } = require('./adapters/oracle');
      return new OracleAdapter(config);
    }

    case 'sqlite': {
      const config = Config.getSqliteConfig();
      if (!config) throw new Error('SQLITE_PATH 环境变量未配置');
      const { SQLiteAdapter } = require('./adapters/sqlite');
      return new SQLiteAdapter(config);
    }

    default:
      throw new Error(`不支持的数据库类型: ${dbType}`);
  }
}

export function listConfiguredDatabases(): Record<string, boolean> {
  return {
    mysql: Config.getMysqlConfig() !== null,
    postgres: Config.getPostgresConfig() !== null,
    mongodb: Config.getMongodbConfig() !== null,
    redis: Config.getRedisConfig() !== null,
    oracle: Config.getOracleConfig() !== null,
    sqlite: Config.getSqliteConfig() !== null
  };
}

export async function closeAllAdapters(): Promise<void> {
  for (const adapter of adapterCache.values()) {
    try {
      await adapter.close();
    } catch {
      // ignore
    }
  }
  adapterCache.clear();
}
