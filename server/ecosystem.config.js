// PM2 Ecosystem Configuration - Supports Development and Production
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  apps: [
    // Development Configuration
    {
      name: 'urbanesta-admin-api-dev',
      script: path.join(__dirname, 'index.js'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      error_file: path.join(__dirname, 'logs', 'dev-pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'dev-pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'dev-pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false, // Set to true for auto-reload on file changes
      ignore_watch: ['node_modules', 'logs', 'uploads', '*.log'],
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    // Production Configuration
    {
      name: 'urbanesta-admin-api',
      script: path.join(__dirname, 'index.js'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

