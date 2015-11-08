
module.exports.getLogger = function(prefix, level) {
  var winston = require('winston')
  var logger = new (winston.Logger)({
    level: level || 'verbose',
    transports: [
      new (winston.transports.Console)(),
    ]
  });
  return require('winston-annotate')(logger, prefix + ': ')
}
