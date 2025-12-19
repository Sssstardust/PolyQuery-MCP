import { Config } from './config';
import { DatabaseAdapter } from './adapters/base';

// 闁倿鍘ら崳銊х处鐎涙﹫绱欓崡鏇氱伐濡€崇础閿?
const adapterCache: Map<string, DatabaseAdapter> = new Map();

export function getAdapter(dbType: string): DatabaseAdapter {
  const type = dbType.toLowerCase();
  
  // 濡偓閺屻儳绱︾€?
  if (adapterCache.has(type)) {
    return adapterCache.get(type)!;
  }

  // 閸掓稑缂撻弬浼粹偓鍌炲帳閸?
  const adapter = createAdapter(type);
  adapterCache.set(type, adapter);
  return adapter;
}

function createAdapter(dbType: string): DatabaseAdapter {
  switch (dbType) {
    case 'mysql': {
      const config = Config.getMysqlConfig();
      if (!config) throw new Error('MYSQL_URL 閻滎垰顣ㄩ崣姗€鍣洪張顏堝帳缂?);
      const { MySQLAdapter } = require('./adapters/mysql');
      return new MySQLAdapter(config);
    }

    case 'postgres':
    case 'postgresql': {
      const config = Config.getPostgresConfig();
      if (!config) throw new Error('POSTGRES_URL 閻滎垰顣ㄩ崣姗€鍣洪張顏堝帳缂?);
      const { PostgresAdapter } = require('./adapters/postgres');
      return new PostgresAdapter(config);
    }

    case 'mongodb':
    case 'mongo': {
      const config = Config.getMongodbConfig();
      if (!config) throw new Error('MONGODB_URL 閻滎垰顣ㄩ崣姗€鍣洪張顏堝帳缂?);
      const { MongoDBAdapter } = require('./adapters/mongodb');
      return new MongoDBAdapter(config);
    }

    case 'redis': {
      const config = Config.getRedisConfig();
      if (!config) throw new Error('REDIS_URL 閻滎垰顣ㄩ崣姗€鍣洪張顏堝帳缂?);
      const { RedisAdapter } = require('./adapters/redis');
      return new RedisAdapter(config);
    }

    case 'oracle': {
      const config = Config.getOracleConfig();
      if (!config) throw new Error('ORACLE_URL 閻滎垰顣ㄩ崣姗€鍣洪張顏堝帳缂?);
      const { OracleAdapter } = require('./adapters/oracle');
      return new OracleAdapter(config);
    }

    default:
      throw new Error(`娑撳秵鏁幐浣烘畱閺佺増宓佹惔鎾惰閸? ${dbType}`);
  }
}

export function listConfiguredDatabases(): Record<string, boolean> {
  return {
    mysql: Config.getMysqlConfig() !== null,
    postgres: Config.getPostgresConfig() !== null,
    mongodb: Config.getMongodbConfig() !== null,
    redis: Config.getRedisConfig() !== null,
    oracle: Config.getOracleConfig() !== null
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
