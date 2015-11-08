
var Queue = require('./queue')
var OsmParser = require('./parser')
var drivers = require('./drivers')

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var Importer = function(opts) {

  this.options = opts
  this.options.recordHandler = opts.recordHandler || function(r) { return Promise.resolve(r) }

  this.parser = new OsmParser(this.options)
  this.queue = new Queue(this.options.queueSize)
  this.logger = require('./logger').getLogger('importer', this.options.logLevel)

  this.stats = {
    insert: 0,
    insertLen: 0
  }
}
util.inherits(Importer, EventEmitter)
module.exports = Importer

Importer.prototype.getParserStats = function() {
  return this.getStats().parser
}

Importer.prototype.getStats = function() {
  this.stats.parser = this.parser.getStats()
  this.stats.speedAvg = (this.stats.insertLen/this.stats.insert)
  return this.stats
}

Importer.prototype.getStatsString = function() {
  var stats = this.getStats()
  var mem = process.memoryUsage()

  var t = (stats.parser.runTime/1000)

  var m = ""
  var s = Math.round(t)+"s"
  if(t > 60) {
    m = s = Math.floor(t / 60) + "m "
    s = Math.round(t % 60) + "s"
  }
  t = m + s
  return "\n---\nRun time "+
    t
  +" [node="+
    stats.parser.records.node
  +",way="+
    stats.parser.records.way
  +",relation="+
    stats.parser.records.relation
  +"] \nAverage insert speed " +
    this.stats.speedAvg/1000
  +"\nMemory usage " +
    Math.round((mem.heapUsed/1024)/1024)
  +"MB / " +
    Math.round((mem.heapTotal/1024)/1024) + "MB\n---"
}

Importer.prototype.printStats = function() {
  console.log(this.getStatsString())
}

Importer.prototype.end = function() {
  this.logger.verbose('end')
  this.parser && this.parser.end()
  this.emit('end')
}

Importer.prototype.stop = function() {
  this.logger.verbose('stop')
  this.parser && this.parser.stop()
  this.emit('stop')
}

Importer.prototype.resume = function() {
  this.logger.verbose('resume')
  this.parser && this.parser.resume()
  this.emit('resume')
}

Importer.prototype.isStopped = function() {
  return this.parser.stopped
}

Importer.prototype.isEnded = function() {
  return this.parser.streamEnd
}

Importer.prototype.fromFile = function(filename) {
  this.logger.verbose('load from file')
  this.options.filename = filename
  this.options.stream = null
  this.start()
}

Importer.prototype.fromStream = function(stream) {
  this.logger.verbose('load from stream')
  this.options.stream = stream
  this.options.filename = null
  this.start()
}

Importer.prototype.getDriver = function() {
  return drivers.get(this.options.driver)
}

Importer.prototype.start = function() {

  if(!this.options.filename && !this.options.stream) {
    throw new Error("A filename or stream must be specified!")
  }

  var me = this
  var logger = this.logger
  var parser = this.parser
  var queue = this.queue
  var driver = this.getDriver()

  driver
    .connect(this.options[this.options.driver] || {})
    .catch(function(e) {
      me.emit('error', e)
      return Promise.reject()
    })
    .then(function() {
      parser.on('error', function(e) {
        logger.error('parser error', e.message, e)
        me.emit("error", e)
        return Promise.resolve()
      })

      parser.on('record', function(record) {
        me.options.recordHandler(record).then(function(_record) {
          queue.set(_record || record)
        })
      })

      parser.on('end', function() {
        if(me.isStopped() && !me.isEnded()) return
        queue.emit('end')
      })

      var ops = 0
      var save = function(len) {

        me.stats.insert++
        var insertlen = me.stats.insert
        var time = (new Date).getTime()

        ops++
        if(ops > 50) {
          logger.debug("Stop parser")
          me.stop()
          me.options.stats && me.logger.info(me.getStatsString())
        }

        return driver.save(queue.get(len || null))
          .then(function() {

            logger.debug('driver save done')

            if(me.options.stats) {

              var runlen = (new Date).getTime() - time

              me.logger.debug("Insert time %ss", ((runlen / 1000)/insertlen) )
              me.logger.debug("Queue len %s", queue.length)

            }

            me.stats.insertLen += time
            ops--

            if(ops === 0 && !me.isEnded()) {
              me.options.stats && me.logger.info(me.getStatsString())
              logger.debug("Resume parser")
              me.resume()
            }

            return Promise.resolve()
          })
          .catch(function(e) {
            ops--
            logger.error('driver save error', e.message, e)
            me.emit('error', e)
            return Promise.reject()
          })
      }

      queue.on('batch', function() {
        logger.debug('queue batch')
        save()
      })

      queue.on('end', function() {
        logger.debug('queue end')
        save(queue.length).then(function() {
          me.getDriver().disconnect()
        })
      })

      if(me.options.filename) {
        parser.fromFile(me.options.filename)
      }
      else if(me.options.stream) {
        parser.fromStream(me.options.stream)
      }

    })

  logger.verbose('importer started')
  this.emit('start')
}
