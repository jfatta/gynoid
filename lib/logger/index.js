const chalk = require('chalk');

module.exports = {
  info: function info(text) {
    console.log(text);
  },
  log: function log(text) {
    this.info(text);
  },
  debug: function debug(text) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(chalk.yellow(`### DEBUG ----> ${text}`));
    }
  },
  error: function error(text) {
    console.error(chalk.red(text));
  }
};
