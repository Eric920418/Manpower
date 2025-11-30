module.exports = {
  apps: [{
    name: 'manpower',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/Manpower',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
