
var expat = require('node-expat')
var Promise = require('bluebird')
var _ = require('lodash')
var fs = require('fs')
var util = require("util");
var EventEmitter = require("events").EventEmitter;

var models = require('./models')

var OsmParser = function(opts) {
  opts = opts || {}
  EventEmitter.call(this)

  this.logger = require('./logger').getLogger('parser', opts.logLevel || 'silly')

  this.stats = {
    startTime: null,
    endTime: null,
    records: {
      node: 0,
      way: 0,
      relation: 0
    }
  }

  this.stream = null
  this.parser = null
  this.streamEnd = false
  this.stopped = false
}

util.inherits(OsmParser, EventEmitter)
module.exports = OsmParser


OsmParser.prototype.getStats = function() {
  this.stats.endTime = (new Date).getTime()
  this.stats.runTime = this.stats.endTime-this.stats.startTime
  return this.stats
}

OsmParser.prototype.printStats = function() {
  var stats = this.getStats()
  console.log("Run time %ss [node=%s,way=%s,relation=%s]",
                stats.runTime/1000,
                stats.records.node,
                stats.records.way,
                stats.records.relation
              )
}

OsmParser.prototype.timer = function(op) {
  var time = (new Date).getTime()
  if(op === true) {
    this.stats.startTime = time
  }
  else {
    this.stats.endTime = time
  }
}

OsmParser.prototype.getParser = function(encoding) {
  if(!this.parser) {
    this.parser = new expat.Parser(encoding || 'UTF-8')
  }
  return this.parser
}

OsmParser.prototype.stop = function() {
  if(!this.getParser()) return

  if(!this.stopped) {
    this.logger.silly("stop")
    this.stopped = true
    this.stream.pause()
    // this.getParser().stop()
  }
}

OsmParser.prototype.resume = function() {
  if(!this.getParser()) return
  if(this.stopped) {
    this.logger.silly("resume")
    this.stopped = false
    // this.getParser().resume()
    this.stream.resume()
  }
}

OsmParser.prototype.end = function() {

  var parser = this.getParser()
  if(!parser) return

  this.logger.silly("end")
  this.timer(false)
  this.emit('end')
  this.parser = null

  parser.end()
}

OsmParser.prototype.fromFile = function(filename) {

  var stream

  try {
    stream = fs.createReadStream(filename)
  }
  catch(e) {
    this.emit('error', e)
  }

  return this.fromStream(stream)
}

OsmParser.prototype.fromStream = function (stream) {

  this.stream = stream

  var me = this
  var parser = this.getParser()
  var record
  var store = false

  this.timer(true)

  parser.on('startElement', function (name, attrs) {
    // console.log(name, attrs)
    switch (name) {
      case "node":
      case "way":
      case "relation":
        record = new models[name](attrs)
        me.stats.records[name]++
        store = true
        break;
      case "tag":
        record.tags[attrs.k] = attrs.v
        break;
      case "member":
        record.members.push(attrs)
        break;
      case "nd":
        record.nds.push(attrs)
        break;
    }

  })

  parser.on('endElement', function (name) {
    if(store) {
      store = false
      me.emit('record', record)
    }
  })

  // parser.on('text', function (text) {
  //   console.log("text [[", text, "]]")
  // })

  parser.on('error', function (error) {
    if(error === 'parser suspended') return
    me.emit('error', error)
  })

  stream.on('data', function(data) {
    me.logger.silly("new stream data")
    parser.write(data)
  })

  stream.on('end', function() {
    me.logger.silly("stream end")
    me.streamEnd = true
    me.end()
  })

}
