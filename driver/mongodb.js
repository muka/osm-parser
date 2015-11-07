var lib = module.exports

var Promise = require('bluebird')

var dbconf = {
  host: "192.168.77.10",
  port: 27017,
  dbname: 'osm',
}

var db
var connect = function() {
  return new Promise(function(resolve, reject) {
    if(db) return resolve(db)
    var MongoClient = require('mongodb').MongoClient
    // Connection URL
    var url = 'mongodb://'+dbconf.host+':'+dbconf.port+'/'+dbconf.dbname;
    // Use connect method to connect to the Server
    MongoClient.connect(url, function(err, dbconn) {
      if(err) return reject(err)
      db = dbconn
      console.log("mongo connected");
      resolve(db)
    })
  })
}

connect()

lib.save = function(list) {
  return connect().then(function(db) {

    var batches = {}
    list.forEach(function(record) {

      if(!batches[record.type]) {
        var col = db.collection(record.type)
        batches[record.type] = col.initializeUnorderedBulkOp({useLegacyOps: true});
      }

      batches[record.type].insert(record.toJSON())
    })

    return Promise.all(Object.keys(batches))
      .map(function(type) {
        return batches[type]
      })
      .each(function(batch) {
        return new Promise(function(resolve, reject) {
          batch.execute(function(err, result) {
            if(err) return reject(err)
            resolve(result)
          })
        })
      })
  })
}
