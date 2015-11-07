
var util = require("util")

var copy = function(dest, src) {
  Object.keys(src).forEach(function(k) {
    k = k.replace('.', '_')
    dest[k] = src[k]
  })
}

var Model = function(meta, type) {
  this.type = type
  this.meta = meta
  this.tags = {}
}
Model.prototype.toJSON = function() {
  var obj = {}
  copy(obj, this.meta)
  obj.tags = {}
  copy(obj.tags, this.tags)
  return obj
}

var Node = function(meta) {
  Model.apply(this, [meta, 'node'])
}
util.inherits(Node, Model);

var Way = function(meta) {
  Model.apply(this, [meta, 'way'])
  this.nds = []
}
util.inherits(Way, Model);
Way.prototype.toJSON = function() {
  var obj = Model.prototype.toJSON.call(this)
  obj.nds = {}
  copy(obj.nds, this.nds)
  return obj
}

var Relation = function(meta) {
  Model.apply(this, [meta, 'relation'])
  this.members = []
}
util.inherits(Relation, Model);
Relation.prototype.toJSON = function() {
  var obj = Model.prototype.toJSON.call(this)
  obj.members = {}
  copy(obj.members, this.members)
  return obj
}

module.exports = {
  'node': Node,
  'way': Way,
  'relation': Relation,
}
