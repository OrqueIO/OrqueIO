export const environment = {
  production: false,

  apiUrl: '/orqueio/api',
  engineUrl: '/orqueio/api/engine/engine',
  adminUrl: '/orqueio/api/admin',
  defaultEngine: 'default',
  authUrl: '/orqueio/api/admin/auth/user',
  oauth2Url: '/orqueio/api/oauth2',

  sessionCheckInterval: 60000,
  features: {
    enableDevTools: true,
    enableLogging: true,
    enableMockData: false
  },
  logging: {
    level: 'debug', // 'debug' | 'info' | 'warn' | 'error'
    enableConsole: true
  }
};
