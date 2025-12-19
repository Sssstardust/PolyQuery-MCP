# PolyQuery MCP

[![npm version](https://badge.fury.io/js/polyquery-mcp.svg)](https://badge.fury.io/js/polyquery-mcp)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

娑撯偓娑擃亝鏁幐浣割樋缁夊秵鏆熼幑顔肩氨閻?MCP (Model Context Protocol) 閺屻儴顕楀銉ュ徔閿涘矁顔€ AI 閸斺晜澧滈懗钘夘檮閻╁瓨甯撮弻銉嚄娴ｇ姷娈戦弫鐗堝祦鎼存挶鈧?

閺€顖涘瘮閿?*MySQL** | **PostgreSQL** | **MongoDB** | **Redis** | **Oracle**

## 棣冩畬 韫囶偊鈧喎绱戞慨?

### 鐎瑰顥?
```bash
npm install -g polyquery-mcp
```

### 闁板秶鐤?MCP 鐎广垺鍩涚粩?

閸?Claude Desktop閵嗕竼ursor 閹存牕鍙炬禒?MCP 鐎广垺鍩涚粩顖欒厬濞ｈ濮為柊宥囩枂閿?

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
        "MAX_ROWS": 1000,
        "QUERY_TIMEOUT": 30000,
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

閹存牞鈧懍濞囬悽?npx閿?

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

## 棣冩憠 闁板秶鐤嗙拠瀛樻

### 閺佺増宓佹惔鎾圭箾閹?URL

| 閺佺増宓佹惔?| 閻滎垰顣ㄩ崣姗€鍣?| 閺嶇厧绱?|
|--------|----------|------|
| MySQL | `MYSQL_URL` | `mysql://user:pass@host:3306/db` |
| PostgreSQL | `POSTGRES_URL` | `postgresql://user:pass@host:5432/db` |
| MongoDB | `MONGODB_URL` | `mongodb://user:pass@host:27017/db` |
| Redis | `REDIS_URL` | `redis://:password@host:6379/0` |
| Oracle | `ORACLE_URL` | `oracle://user:pass@host:1521/service` |

### 鐎瑰鍙忛柊宥囩枂

| 閻滎垰顣ㄩ崣姗€鍣?| 姒涙顓婚崐?| 鐠囧瓨妲?|
|----------|--------|------|
| `READ_ONLY_MODE` | `true` | 閸欘亣顕板Ο鈥崇础閿涘瞼顩﹀銏犲晸閹垮秳缍?|
| `MAX_ROWS` | `1000` | 閺堚偓婢堆嗙箲閸ョ偠顢戦弫?|
| `QUERY_TIMEOUT` | `30000` | 閺屻儴顕楃搾鍛閿涘牊顕犵粔鎺炵礆 |

## 棣冩礈 閸欘垳鏁ゅ銉ュ徔

| 瀹搞儱鍙?| 鐠囧瓨妲?|
|------|------|
| `query_database` | 閹笛嗩攽閺佺増宓佹惔鎾寸叀鐠?|
| `list_tables` | 閸掓鍤幍鈧張澶庛€?闂嗗棗鎮?|
| `describe_table` | 閼惧嘲褰囩悰銊х波閺?|
| `test_connection` | 濞村鐦弫鐗堝祦鎼存捁绻涢幒?|
| `list_databases` | 閸掓鍤鏌ュ帳缂冾喚娈戦弫鐗堝祦鎼?|

## 棣冩寱 娴ｈ法鏁ょ粈杞扮伐

### SQL 閺佺増宓佹惔?
```
"鐢喗鍨滈弻銉嚄 users 鐞涖劋鑵戦獮鎾窞婢堆傜艾 18 閻ㄥ嫮鏁ら幋?
閳?query_database(db_type="mysql", query="SELECT * FROM users WHERE age > 18")
```

### MongoDB
```
"閺屻儴顕?orders 闂嗗棗鎮庢稉顓犲Ц閹椒璐?pending 閻ㄥ嫯顓归崡?
閳?query_database(db_type="mongodb", query='{"collection":"orders","filter":{"status":"pending"}}')
```

### Redis
```
"閼惧嘲褰?user:123 閻ㄥ嫭澧嶉張澶婄摟濞?
閳?query_database(db_type="redis", query="HGETALL user:123")
```

## 棣冩晙 鐎瑰鍙忛悧瑙勨偓?

- 閴?姒涙顓婚崣顏囶嚢濡€崇础閿涘瞼顩﹀?INSERT/UPDATE/DELETE
- 閴?閼奉亜濮╁ǎ璇插 LIMIT 闂勬劕鍩楅敍宀勬Щ濮濄垼绻戦崶鐐剁箖婢舵碍鏆熼幑?
- 閴?閺屻儴顕楃搾鍛娣囨繃濮?- 閴?SQL 濞夈劌鍙嗛梼鍙夊Б
- 閴?闁挎瑨顕ゆ穱鈩冧紖閼磋鲸鏅?
## 棣冩憹 娴犲孩绨惍浣圭€?

```bash
git clone https://github.com/yourusername/polyquery-mcp.git
cd polyquery-mcp
npm install
npm run build
```

## 棣冾檪 鐠愶紕灏?
濞嗐垼绻嬮幓鎰唉 Issue 閸?Pull Request閿?

## 棣冩惈 鐠佺褰茬拠?

MIT License
