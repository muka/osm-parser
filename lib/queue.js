
var util = require("util");
var EventEmitter = require("events").EventEmitter;

var Queue = function(batchSize) {
  this.batchSize = batchSize || 1000
  this.list = []
}
util.inherits(Queue, EventEmitter)
module.exports = Queue

Queue.prototype.set = function(records) {

  if(records instanceof Array) {
    this.list.concat(records)
  }
  else {
    this.list.push(records)
  }

  this.length = this.list.length

  if(this.list.length >= this.batchSize) {
    this.emit('batch')
  }
}

Queue.prototype.get = function(len) {
  var len = len || this.batchSize
  var list = this.list.splice(0, len)
  this.length = this.list.length
  return list
}
