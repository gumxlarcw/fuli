// Fuli: chat data BPS Maluku Utara. Hanya melayani edge lewat ufw; bind ke alamat LAN app.
module.exports = {
  apps: [{
    name: 'fuli',
    script: './node_modules/.bin/next',
    args: 'start -H 10.82.7.8 -p 6070',
    interpreter: 'none',
    cwd: '/opt/public/fuli',
    exec_mode: 'fork',
    instances: 1,
    watch: false,
    max_memory_restart: '400M',
    kill_timeout: 8000,
    env: { NODE_ENV: 'production' },
  }],
};
