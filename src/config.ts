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

  // 解析 MySQL URL
  getMysqlConfig(): DatabaseConfig | null {
    const url = process.env.MYSQL_URL;
    if (!url) return null;
    return this.parseSqlUrl(url, 3306);
  },

  // 解析 PostgreSQL URL
  getPostgresConfig(): DatabaseConfig | null {
    const url = process.env.POSTGRES_URL;
    if (!url) return null;
    return this.parseSqlUrl(url, 5432);
  },

  // 解析 MongoDB URL
  getMongodbConfig(): DatabaseConfig | null {
    const url = process.env.MONGODB_URL;
    if (!url) return null;
    
    // MongoDB 直接使用连接字符串
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
  getRedisConfig(): DatabaseConfig | null {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    
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
      
      return { host, port, password, database };
    } catch {
      return null;
    }
  },

  // 解析 Oracle URL
  getOracleConfig(): DatabaseConfig | null {
    const url = process.env.ORACLE_URL;
    if (!url) return null;
    
    // oracle://user:password@host:port/service
    const match = url.match(/^oracle:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2],
        database: match[5]
      };
    }
    return null;
  },

  // 解析 SQLite 路径
  getSqliteConfig(): DatabaseConfig | null {
    const path = process.env.SQLITE_PATH;
    if (!path) return null;
    
    return {
      host: 'localhost',
      port: 0,
      database: path  // 文件路径
    };
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
