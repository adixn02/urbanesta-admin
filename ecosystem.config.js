// PM2 Ecosystem Configuration - Combined for Backend and Frontend
// Supports both Development and Production modes
// Use this from project root to start both services together
const path = require('path');

module.exports = {
  apps: [
    // ========== DEVELOPMENT MODE ==========
    // Backend Development
    {
      name: 'urbanesta-admin-api-dev',
      script: path.join(__dirname, 'server', 'index.js'),
      cwd: path.join(__dirname, 'server'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      error_file: path.join(__dirname, 'server', 'logs', 'dev-pm2-error.log'),
      out_file: path.join(__dirname, 'server', 'logs', 'dev-pm2-out.log'),
      log_file: path.join(__dirname, 'server', 'logs', 'dev-pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '*.log'],
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    // Frontend Development
    {
      name: 'urbanesta-admin-frontend-dev',
      script: 'npm',
      args: 'run dev',
      cwd: path.join(__dirname, 'admin'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: path.join(__dirname, 'admin', 'logs', 'dev-pm2-error.log'),
      out_file: path.join(__dirname, 'admin', 'logs', 'dev-pm2-out.log'),
      log_file: path.join(__dirname, 'admin', 'logs', 'dev-pm2-combined.log'),
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
    // ========== PRODUCTION MODE ==========
    // Backend Production
    {
      name: 'urbanesta-admin-api',
      script: path.join(__dirname, 'server', 'index.js'),
      cwd: path.join(__dirname, 'server'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: path.join(__dirname, 'server', 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'server', 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'server', 'logs', 'pm2-combined.log'),
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
    },
    // Frontend Production (requires build first)
    {
      name: 'urbanesta-admin-frontend',
      script: 'npm',
      args: 'start',
      cwd: path.join(__dirname, 'admin'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: path.join(__dirname, 'admin', 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'admin', 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'admin', 'logs', 'pm2-combined.log'),
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

