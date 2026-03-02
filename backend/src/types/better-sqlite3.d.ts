declare module 'better-sqlite3' {
  interface Statement {
    run(...args: any[]): any;
    get(...args: any[]): any;
    all(...args: any[]): any;
  }
  
  interface Database {
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }
  
  const Database: {
    new (path: string): Database;
  };
  
  export default Database;
}
