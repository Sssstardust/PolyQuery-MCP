import { MongoClient, Db, Document } from 'mongodb';
import { DatabaseAdapter, QueryResult, TableInfo, ColumnInfo } from './base';
import { Config, DatabaseConfig } from '../config';

export class MongoDBAdapter extends DatabaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.client = new MongoClient(this.config.connectionString!, {
        serverSelectionTimeoutMS: Config.QUERY_TIMEOUT
      });
      await this.client.connect();
      this.db = this.client.db(this.config.database);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.client!.db('admin').command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async executeQuery(query: string, _params?: any[], limit: number = Config.MAX_ROWS): Promise<QueryResult[]> {
    await this.connect();

    // 鐟欙絾鐎?JSON 閺屻儴顕?    let queryObj: any;
    try {
      queryObj = JSON.parse(query);
    } catch {
      throw new Error('MongoDB 閺屻儴顕楄箛鍛淬€忛弰顖涙箒閺佸牏娈?JSON 閺嶇厧绱?);
    }

    const collectionName = queryObj.collection;
    if (!collectionName) {
      throw new Error('韫囧懘銆忛幐鍥х暰 collection');
    }

    const collection = this.db!.collection(collectionName);
    const operation = queryObj.operation || 'find';
    const filter = queryObj.filter || {};
    const projection = queryObj.projection;
    const sort = queryObj.sort;
    const skip = queryObj.skip || 0;

    let result: any[];

    switch (operation) {
      case 'find':
        let cursor = collection.find(filter, { projection });
        if (sort) cursor = cursor.sort(sort);
        cursor = cursor.skip(skip).limit(limit);
        result = await cursor.toArray();
        break;

      case 'findOne':
        const doc = await collection.findOne(filter, { projection });
        result = doc ? [doc] : [];
        break;

      case 'count':
        const count = await collection.countDocuments(filter);
        result = [{ count }];
        break;

      case 'distinct':
        const field = queryObj.field || '_id';
        const values = await collection.distinct(field, filter);
        result = [{ field, values }];
        break;

      case 'aggregate':
        const pipeline = queryObj.pipeline || [];
        pipeline.push({ $limit: limit });
        result = await collection.aggregate(pipeline).toArray();
        break;

      default:
        throw new Error(`娑撳秵鏁幐浣烘畱閹垮秳缍旂猾璇茬€? ${operation}`);
    }

    // 鏉烆剚宕?ObjectId 娑撳搫鐡х粭锔胯
    return result.map(doc => this.convertObjectIds(doc));
  }

  private convertObjectIds(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (obj._bsontype === 'ObjectId' || obj.constructor?.name === 'ObjectId') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertObjectIds(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.convertObjectIds(value);
      }
      return result;
    }
    
    return obj;
  }

  async getSchemaInfo(): Promise<TableInfo[]> {
    await this.connect();
    const collections = await this.db!.listCollections().toArray();
    return collections.map(col => ({ name: col.name }));
  }

  async describeTable(collectionName: string): Promise<ColumnInfo[]> {
    await this.connect();
    const collection = this.db!.collection(collectionName);
    
    // 闁插洦鐗辨稉鈧稉顏呮瀮濡楋絾娼甸幒銊︽焽缂佹挻鐎?    const sample = await collection.findOne();
    if (!sample) {
      return [{ name: 'message', type: '闂嗗棗鎮庢稉铏光敄閿涘本妫ゅ▔鏇熷腹閺傤厾绮ㄩ弸? }];
    }

    return Object.entries(sample).map(([key, value]) => ({
      name: key,
      type: typeof value === 'object' ? (value?.constructor?.name || 'object') : typeof value
    }));
  }
}
