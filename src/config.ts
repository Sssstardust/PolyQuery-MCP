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

// 閸楅亶娅?SQL 閸忔娊鏁€涙绱欓崣顏囶嚢濡€崇础娑撳顩﹀顫礆
const DANGEROUS_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
  'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE',
  'CALL', 'SHUTDOWN', 'KILL'
];

// Redis 閸愭瑥鍙嗛崨鎴掓姢姒涙垵鎮曢崡?
const REDIS_WRITE_COMMANDS = [
  'SET', 'DEL', 'EXPIRE', 'HSET', 'HDEL', 'LPUSH', 'RPUSH', 'LPOP', 'RPOP',
  'SADD', 'SREM', 'ZADD', 'ZREM', 'FLUSHDB', 'FLUSHALL', 'RENAME', 'COPY',
  'APPEND', 'SETEX', 'SETNX', 'MSET', 'INCR', 'DECR', 'INCRBY', 'DECRBY'
];

export const Config = {
  // 鐎瑰鍙忛柊宥囩枂
  READ_ONLY_MODE: (process.env.READ_ONLY_MODE || 'true').toLowerCase() === 'true',
  MAX_ROWS: parseInt(process.env.MAX_ROWS || '1000', 10),
  QUERY_TIMEOUT: parseInt(process.env.QUERY_TIMEOUT || '30000', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',

  // 鐟欙絾鐎?MySQL URL
  getMysqlConfig(): DatabaseConfig | null {
    const url = process.env.MYSQL_URL;
    if (!url) return null;
    return this.parseSqlUrl(url, 3306);
  },

  // 鐟欙絾鐎?PostgreSQL URL
  getPostgresConfig(): DatabaseConfig | null {
    const url = process.env.POSTGRES_URL;
    if (!url) return null;
    return this.parseSqlUrl(url, 5432);
  },

  // 鐟欙絾鐎?MongoDB URL
  getMongodbConfig(): DatabaseConfig | null {
    const url = process.env.MONGODB_URL;
    if (!url) return null;
    
    // MongoDB 閻╁瓨甯存担璺ㄦ暏鏉╃偞甯寸€涙顑佹稉?
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

  // 鐟欙絾鐎?Redis URL
  getRedisConfig(): DatabaseConfig | null {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    
    // 閹靛濮╃憴锝嗙€?Redis URL閿涘本鏁幐浣哥槕閻椒鑵戦惃鍕濞堝﹤鐡х粭锔肩礄婵?#閿?
    // 閺嶇厧绱? redis://:password@host:port/db 閹?redis://host:port/db
    try {
      // 缁夊娅庨崡蹇氼唴閸撳秶绱?      let remaining = url.replace(/^redis:\/\//, '');
      
      let password: string | undefined;
      let host: string;
      let port: number = 6379;
      let database: string = '0';
      
      // 娴犲骸鎮楀鈧崜宥埿掗弸鎰剁礉閸忓牊澹橀張鈧崥搴濈娑?@ 缁楋箑褰块敍鍫濈槕閻礁褰查懗钘夊瘶閸?@閿?
      const atIndex = remaining.lastIndexOf('@');
      if (atIndex !== -1) {
        // 閺堝顓荤拠浣蜂繆閹?
        const authPart = remaining.substring(0, atIndex);
        remaining = remaining.substring(atIndex + 1);
        
        // 鐠併倛鐦夐弽鐓庣础: :password 閹?user:password
        if (authPart.startsWith(':')) {
          password = authPart.substring(1);
        } else {
          const colonIndex = authPart.indexOf(':');
          if (colonIndex !== -1) {
            password = authPart.substring(colonIndex + 1);
          }
        }
      }
      
      // 鐟欙絾鐎?host:port/db
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

  // 鐟欙絾鐎?Oracle URL
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

  // 闁氨鏁?SQL URL 鐟欙絾鐎?  parseSqlUrl(url: string, defaultPort: number): DatabaseConfig | null {
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

  // 妤犲矁鐦?SQL 閺屻儴顕楃€瑰鍙忛幀?
  validateSqlQuery(query: string): { valid: boolean; error?: string } {
    if (!this.READ_ONLY_MODE) {
      return { valid: true };
    }

    // 缁夊娅庡▔銊╁櫞
    let cleanQuery = query.replace(/--.*$/gm, '');
    cleanQuery = cleanQuery.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanQuery = cleanQuery.trim().toUpperCase();

    for (const keyword of DANGEROUS_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`);
      if (regex.test(cleanQuery)) {
        return { valid: false, error: `閸欘亣顕板Ο鈥崇础娑撳顩﹀顫▏閻?${keyword} 鐠囶厼褰瀈 };
      }
    }

    return { valid: true };
  },

  // 妤犲矁鐦?Redis 閸涙垝鎶ょ€瑰鍙忛幀?
  validateRedisCommand(command: string): { valid: boolean; error?: string } {
    if (!this.READ_ONLY_MODE) {
      return { valid: true };
    }

    if (REDIS_WRITE_COMMANDS.includes(command.toUpperCase())) {
      return { valid: false, error: `閸欘亣顕板Ο鈥崇础娑撳顩﹀顫▏閻?${command} 閸涙垝鎶 };
    }

    return { valid: true };
  },

  // 妤犲矁鐦夐弽鍥槕缁楋讣绱欑悰銊ユ倳閵嗕够chema閸氬稄绱?  validateIdentifier(name: string): string {
    if (!name) return name;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`閺冪姵鏅ラ惃鍕垼鐠囧棛顑? ${name}`);
    }
    return name;
  }
};
