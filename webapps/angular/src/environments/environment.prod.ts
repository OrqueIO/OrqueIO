export const environment = {
  production: true,

  apiUrl: '/orqueio/api',
  engineUrl: '/orqueio/api/engine/engine',
  adminUrl: '/orqueio/api/admin',
  defaultEngine: 'default',
  authUrl: '/orqueio/api/admin/auth/user',
  oauth2Url: '/orqueio/api/oauth2',
  
  sessionCheckInterval: 60000,

  features: {
    enableDevTools: false,
    enableLogging: false,
    enableMockData: false
  },

  logging: {
    level: 'error', // 'debug' | 'info' | 'warn' | 'error'
    enableConsole: false
  }
};
