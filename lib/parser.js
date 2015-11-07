
var expat = require('node-expat')
var Promise = require('bluebird')
var _ = require('lodash')
var fs = require('fs')
var util = require("util");
var EventEmitter = require("events").EventEmitter;

var models = require('./models')

var OsmParser = function() {
  EventEmitter.call(this)
  this.stats = {
    startTime: null,
    endTime: null,
    records: {
      node: 0,
      way: 0,
      relation: 0
    }
  }
}

util.inherits(OsmParser, EventEmitter)
module.exports = OsmParser

OsmParser.prototype.printStats = function() {
  var len = (this.stats.endTime-this.stats.startTime)/1000
  console.log("Run time %ss [node=%s,way=%s,relation=%s]",
                len,
                this.stats.records.node,
                this.stats.records.way,
                this.stats.records.relation
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
  this.getParser() && this.getParser().stop()
}

OsmParser.prototype.resume = function() {
  this.getParser() && this.getParser().resume()
}

OsmParser.prototype.end = function() {

  var parser = this.getParser()
  if(!parser) return

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
    me.emit('error', error)
  })

  stream.on('data', function(data) {
    parser.write(data)
  })

  stream.on('end', function() {
    me.end()
  })

}
