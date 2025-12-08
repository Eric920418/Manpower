module.exports = {
  apps: [{
    name: 'manpower',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -H 127.0.0.1',
    cwd: '/var/www/Manpower',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://manpower:manpower123@localhost:5432/manpower',
      NEXTAUTH_SECRET: 'cFI4Lt/BuzgZ9NbMqf7L/EgqLrODiaYBPuGssZA59y0=',
      NEXTAUTH_URL: 'http://35.77.90.90'
    }
  }]
}
