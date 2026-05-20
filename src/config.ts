import * as dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;
}

// 危险 SQL 关键字（只读模式下禁止）
const DANGEROUS_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
  'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE',
  'CALL', 'SHUTDOWN', 'KILL'
];

// Redis 写入命令黑名单
const REDIS_WRITE_COMMANDS = [
  'SET', 'DEL', 'EXPIRE', 'HSET', 'HDEL', 'LPUSH', 'RPUSH', 'LPOP', 'RPOP',
  'SADD', 'SREM', 'ZADD', 'ZREM', 'FLUSHDB', 'FLUSHALL', 'RENAME', 'COPY',
  'APPEND', 'SETEX', 'SETNX', 'MSET', 'INCR', 'DECR', 'INCRBY', 'DECRBY'
];

export const Config = {
  // 安全配置
  READ_ONLY_MODE: (process.env.READ_ONLY_MODE || 'true').toLowerCase() === 'true',
  MAX_ROWS: parseInt(process.env.MAX_ROWS || '1000', 10),
  QUERY_TIMEOUT: parseInt(process.env.QUERY_TIMEOUT || '30000', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',

  // 扫描环境变量，按前缀收集所有数据源
  // 规则: {DB_TYPE}_{name}=连接字符串，第一个 _ 前为 db_type，之后全部为 name
  // 例: ORACLE_pdc、MYSQL_order_db、SQLITE_main
  getConfigsByPrefix(prefix: string): Record<string, string> | null {
    const upper = prefix.toUpperCase() + '_';
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;
      if (key.toUpperCase().startsWith(upper)) {
        // 截取第一个 _ 后的部分作为 name，统一转小写
        const name = key.slice(upper.length).toLowerCase();
        if (name) result[name] = value;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  },

  getMysqlConfigs(): Record<string, DatabaseConfig> | null {
    const envs = this.getConfigsByPrefix('MYSQL');
    if (!envs) return null;
    return this.parseUrlMap(envs, 3306);
  },

  getPostgresConfigs(): Record<string, DatabaseConfig> | null {
    const envs = this.getConfigsByPrefix('POSTGRES');
    if (!envs) return null;
    return this.parseUrlMap(envs, 5432);
  },

  getMongodbConfigs(): Record<string, DatabaseConfig> | null {
    const envs = this.getConfigsByPrefix('MONGODB');
    if (!envs) return null;
    const result: Record<string, DatabaseConfig> = {};
    for (const [name, url] of Object.entries(envs)) {
      const config = this.parseMongodbUrl(url);
      if (config) result[name] = config;
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  getRedisConfigs(): Record<string, DatabaseConfig> | null {
    const envs = this.getConfigsByPrefix('REDIS');
    if (!envs) return null;
    const result: Record<string, DatabaseConfig> = {};
    for (const [name, url] of Object.entries(envs)) {
      const config = this.parseRedisUrl(url);
      if (config) result[name] = config;
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  getOracleConfigs(): Record<string, DatabaseConfig> | null {
    const envs = this.getConfigsByPrefix('ORACLE');
    if (!envs) return null;
    const result: Record<string, DatabaseConfig> = {};
    for (const [name, url] of Object.entries(envs)) {
      const config = this.parseOracleUrl(url);
      if (config) result[name] = config;
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  getSqliteConfigs(): Record<string, DatabaseConfig> | null {
    const envs = this.getConfigsByPrefix('SQLITE');
    if (!envs) return null;
    const result: Record<string, DatabaseConfig> = {};
    for (const [name, path] of Object.entries(envs)) {
      result[name] = { host: 'localhost', port: 0, database: path };
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  // 批量解析 URL map
  parseUrlMap(envs: Record<string, string>, defaultPort: number): Record<string, DatabaseConfig> | null {
    const result: Record<string, DatabaseConfig> = {};
    for (const [name, url] of Object.entries(envs)) {
      const config = this.parseSqlUrl(url, defaultPort);
      if (config) result[name] = config;
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  // 解析 MongoDB URL
  parseMongodbUrl(url: string): DatabaseConfig | null {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port) || 27017,
        user: parsed.username || undefined,
        password: parsed.password || undefined,
        database: parsed.pathname.slice(1).split('?')[0] || 'test',
        connectionString: url
      };
    } catch {
      return null;
    }
  },

  // 解析 Redis URL
  parseRedisUrl(url: string): DatabaseConfig | null {
    // 手动解析 Redis URL，支持密码中的特殊字符（如 #）
    // 格式: redis://:password@host:port/db 或 redis://host:port/db
    try {
      // 移除协议前缀
      let remaining = url.replace(/^redis:\/\//, '');

      let password: string | undefined;
      let host: string;
      let port: number = 6379;
      let database: string = '0';

      // 从后往前解析，先找最后一个 @ 符号（密码可能包含 @）
      const atIndex = remaining.lastIndexOf('@');
      if (atIndex !== -1) {
        // 有认证信息
        const authPart = remaining.substring(0, atIndex);
        remaining = remaining.substring(atIndex + 1);

        // 认证格式: :password 或 user:password
        if (authPart.startsWith(':')) {
          password = authPart.substring(1);
        } else {
          const colonIndex = authPart.indexOf(':');
          if (colonIndex !== -1) {
            password = authPart.substring(colonIndex + 1);
          }
        }
      }

      // 解析 host:port/db
      const slashIndex = remaining.indexOf('/');
      if (slashIndex !== -1) {
        database = remaining.substring(slashIndex + 1) || '0';
        remaining = remaining.substring(0, slashIndex);
      }

      const colonIndex = remaining.lastIndexOf(':');
      if (colonIndex !== -1) {
        host = remaining.substring(0, colonIndex);
        port = parseInt(remaining.substring(colonIndex + 1)) || 6379;
      } else {
        host = remaining;
      }

      return {
        host,
        port,
        password: password ? decodeURIComponent(password) : undefined,
        database
      };
    } catch {
      return null;
    }
  },

  // 解析 Oracle URL
  // 格式: oracle://user:password@host:port/service
  parseOracleUrl(url: string): DatabaseConfig | null {
    const match = url.match(/^oracle:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: decodeURIComponent(match[2]),
        database: match[5]
      };
    }
    return null;
  },

  // 通用 SQL URL 解析
  parseSqlUrl(url: string, defaultPort: number): DatabaseConfig | null {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port) || defaultPort,
        user: decodeURIComponent(parsed.username) || undefined,
        password: decodeURIComponent(parsed.password) || undefined,
        database: parsed.pathname.slice(1) || undefined
      };
    } catch {
      return null;
    }
  },

  // 验证 SQL 查询安全性
  validateSqlQuery(query: string): { valid: boolean; error?: string } {
    if (!this.READ_ONLY_MODE) {
      return { valid: true };
    }

    // 移除注释
    let cleanQuery = query.replace(/--.*$/gm, '');
    cleanQuery = cleanQuery.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanQuery = cleanQuery.trim().toUpperCase();

    for (const keyword of DANGEROUS_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`);
      if (regex.test(cleanQuery)) {
        return { valid: false, error: `只读模式下禁止使用 ${keyword} 语句` };
      }
    }

    return { valid: true };
  },

  // 验证 Redis 命令安全性
  validateRedisCommand(command: string): { valid: boolean; error?: string } {
    if (!this.READ_ONLY_MODE) {
      return { valid: true };
    }

    if (REDIS_WRITE_COMMANDS.includes(command.toUpperCase())) {
      return { valid: false, error: `只读模式下禁止使用 ${command} 命令` };
    }

    return { valid: true };
  },

  // 验证标识符（表名、schema名）
  validateIdentifier(name: string): string {
    if (!name) return name;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`无效的标识符: ${name}`);
    }
    return name;
  }
};
