const dotenv = require('dotenv');

dotenv.load({ silent: true });

var env = process.env;

if (!env.GYNOID_CONFIG_PATH) {
  env.GYNOID_CONFIG_PATH = process.cwd() + '/gynoid.config.json';
}

module.exports = env;
