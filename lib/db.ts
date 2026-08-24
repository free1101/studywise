import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const DB_PATH = process.env.DATABASE_PATH || './local.db'

// 惰性初始化：模块加载时（含 Next.js build 收集路由）不打开数据库，
// 首次真正使用时才创建连接并建表。避免 build worker 中 better-sqlite3 SIGSEGV。
let dbInstance: ReturnType<typeof createDb> | null = null

function createDb() {
  console.log('Database: Initializing at', DB_PATH)

  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  // 禁用外键约束
  sqlite.pragma('foreign_keys = OFF')

  const db = drizzle(sqlite, { schema })

  console.log('Database: Creating tables...')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      ai_provider TEXT DEFAULT 'volcengine',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      html TEXT,
      source TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      content_id TEXT,
      quote TEXT,
      quote_offset INTEGER,
      quote_length INTEGER,
      body TEXT,
      type TEXT,
      ai_reply TEXT,
      color TEXT DEFAULT '#FFEB3B',
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      review_questions TEXT,
      ai_evaluation TEXT,
      final_summary TEXT,
      created_at INTEGER
    );
  `)
  console.log('Database: Tables created successfully')

  return db
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDb()
  }
  return dbInstance
}
