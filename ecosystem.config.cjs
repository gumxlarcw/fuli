// Fuli: chat data BPS Maluku Utara. Bind produksi lewat HOST; jangan tulis alamat LAN di berkas ini.
module.exports = {
  apps: [{
    name: 'fuli',
    script: './node_modules/.bin/next',
    args: `start -H ${process.env.HOST || "127.0.0.1"} -p ${process.env.PORT || "6070"}`,
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
