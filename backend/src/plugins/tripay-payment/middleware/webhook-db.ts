'use strict';

/**
 * Shared database connection reference for the webhook middleware.
 * Set after Vendure bootstrap completes.
 */
let dbConnection: any = null;

export function setConnection(conn: any): void {
  dbConnection = conn;
}

export function getConnection(): any {
  return dbConnection;
}
