module.exports = {
  apps: [{
    name: 'instafetch-backend',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on memory limit
    max_restarts: 10,
    min_uptime: '10s',
    // Handle uncaught exceptions
    node_args: '--max-old-space-size=1024',
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000
  }]
}; 