declare module 'better-sqlite3' {
  export interface Statement {
    run(...args: any[]): Database.RunResult;
    get(...args: any[]): any;
    all(...args: any[]): any[];
  }
  
  export interface Database {
    exec(sql: string): Database;
    prepare(sql: string): Statement;
    close(): void;
    pragma(sql: string): any;
  }
  
  export default Database;
  
  namespace Database {
    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }
  }
  
  const Database: {
    new (path: string, options?: any): Database;
  };
}