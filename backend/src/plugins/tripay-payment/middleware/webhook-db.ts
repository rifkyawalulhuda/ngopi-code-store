'use strict';

/**
 * Shared runtime references for the webhook middleware.
 *
 * The webhook is registered as raw Express middleware (needed to access the
 * unparsed request body for HMAC signature verification), which sits outside
 * the Nest DI container. These accessors let it reach the bootstrapped
 * application so it can delegate to real DI-wired services.
 */

let dbConnection: any = null;
let nestApp: any = null;

export function setConnection(conn: any): void {
  dbConnection = conn;
}

export function getConnection(): any {
  return dbConnection;
}

export function setWebhookApp(app: any): void {
  nestApp = app;
}

export function getWebhookApp(): any {
  return nestApp;
}
