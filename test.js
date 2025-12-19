// 濞村鐦懘姘拱
require('dotenv').config();

const { Config } = require('./dist/config');
const { getAdapter, listConfiguredDatabases } = require('./dist/factory');

async function test() {
  console.log('=== PolyQuery MCP Node.js 濞村鐦?===\n');

  // 1. 濞村鐦柊宥囩枂閸旂姾娴?  console.log('1. 瀹告煡鍘ょ純顔炬畱閺佺増宓佹惔?');
  const configured = listConfiguredDatabases();
  for (const [db, status] of Object.entries(configured)) {
    console.log(`   ${db}: ${status ? '閴? : '閴?}`);
  }
  


  // 2. 濞村鐦?MySQL
  console.log('\n2. MySQL 濞村鐦?');
  try {
    const mysql = getAdapter('mysql');
    const connected = await mysql.testConnection();
    console.log(`   鏉╃偞甯? ${connected ? '閴? : '閴?}`);
    
    if (connected) {
      const tables = await mysql.getSchemaInfo();
      console.log(`   鐞涖劍鏆熼柌? ${tables.length}`);
      
      const result = await mysql.executeQuery('SELECT 1 as test', [], 1);
      console.log(`   閺屻儴顕? 閴佹彵);
      
      // 濞村鐦崣顏囶嚢濡€崇础
      try {
        await mysql.executeQuery('DELETE FROM test WHERE 1=0');
        console.log('   閸欘亣顕板Ο鈥崇础: 閴?(閺堫亝瀚ら幋?');
      } catch (e) {
        if (e.message.includes('閸欘亣顕板Ο鈥崇础')) {
          console.log('   閸欘亣顕板Ο鈥崇础: 閴?(瀹稿弶瀚ら幋?');
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    console.log(`   闁挎瑨顕? ${e.message}`);
  }

  // 3. 濞村鐦?Redis
  console.log('\n3. Redis 濞村鐦?');
  try {
    const redis = getAdapter('redis');
    const connected = await redis.testConnection();
    console.log(`   鏉╃偞甯? ${connected ? '閴? : '閴?}`);
    
    if (connected) {
      const info = await redis.getSchemaInfo();
      console.log(`   閺佺増宓佹惔鎾蹭繆閹? ${JSON.stringify(info[0])}`);
      
      // 濞村鐦崣顏囶嚢濡€崇础
      try {
        await redis.executeQuery('SET test_key test_value');
        console.log('   閸欘亣顕板Ο鈥崇础: 閴?(閺堫亝瀚ら幋?');
      } catch (e) {
        if (e.message.includes('閸欘亣顕板Ο鈥崇础')) {
          console.log('   閸欘亣顕板Ο鈥崇础: 閴?(瀹稿弶瀚ら幋?');
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    console.log(`   闁挎瑨顕? ${e.message}`);
  }

  // 4. 濞村鐦?Oracle
  console.log('\n4. Oracle 濞村鐦?');
  try {
    const oracle = getAdapter('oracle');
    const connected = await oracle.testConnection();
    console.log(`   鏉╃偞甯? ${connected ? '閴? : '閴?}`);
    
    if (connected) {
      const tables = await oracle.getSchemaInfo();
      console.log(`   鐞涖劍鏆熼柌? ${tables.length}`);
    }
  } catch (e) {
    console.log(`   闁挎瑨顕? ${e.message}`);
  }

  console.log('\n=== 濞村鐦€瑰本鍨?===');
  process.exit(0);
}

test().catch(e => {
  console.error('濞村鐦径杈Е:', e);
  process.exit(1);
});
