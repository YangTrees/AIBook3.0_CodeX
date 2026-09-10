// 宝塔部署入口：提供安全的生产环境默认值，同时允许面板环境变量覆盖。
process.env.NODE_ENV ||= 'production';
process.env.HOST ||= '127.0.0.1';
process.env.PORT ||= '4181';
process.env.AIBOOK_ACCOUNT_DATA_DIR ||= '/www/wwwroot/aibook-account-data';

await import('./server.mjs');
