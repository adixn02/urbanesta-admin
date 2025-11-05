// PM2 Ecosystem Configuration for Next.js Admin Panel - Supports Dev and Prod
const path = require('path');

module.exports = {
  apps: [
    // Development Configuration
    {
      name: 'urbanesta-admin-frontend-dev',
      script: 'npm',
      args: 'run dev',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: path.join(__dirname, 'logs', 'dev-pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'dev-pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'dev-pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next', '*.log'],
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    // Production Configuration (requires build first)
    {
      name: 'urbanesta-admin-frontend',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

