const base = (window as any).__ORQUEIO_BASE__ || '/orqueio';

export const environment = {
  production: true,

  apiUrl: base + '/api',
  engineUrl: base + '/api/engine/engine',
  adminUrl: base + '/api/admin',
  defaultEngine: 'default',
  authUrl: base + '/api/admin/auth/user',
  oauth2Url: base + '/api/oauth2',
  
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
