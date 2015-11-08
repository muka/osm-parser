var lib = module.exports

var Promise = require('bluebird')
var logger = require('../lib/logger').getLogger('driver.mongodb')

var dbconfig

var db
lib.connect = function(dbconf) {
  dbconfig = dbconf
  logger.silly("connecting")
  return new Promise(function(resolve, reject) {
    if(db) return resolve(db)
    var MongoClient = require('mongodb').MongoClient
    // Connection URL
    var url = 'mongodb://'+dbconf.host+':'+dbconf.port+'/'+dbconf.dbname;
    // Use connect method to connect to the Server
    MongoClient.connect(url, function(err, dbconn) {
      if(err) return reject(err)
      db = dbconn
      logger.silly("connected")      
      if(dbconfig.dropDb) {
        db.dropDatabase(function(err, res) {
          if(err) return reject(err)
          logger.silly("dropped database")
          resolve(db)
        })
      }
      else {
        resolve(db)
      }
    })
  })
}

lib.disconnect = function() {
  db && db.close()
  logger.silly("disconnected")
  return Promise.resolve()
}

lib.save = function(list) {

  logger.silly("save %s items", list.length)

  var batches = {}
  list.forEach(function(record) {

    if(!batches[record.type]) {
      var col = db.collection(record.type)
      batches[record.type] = col.initializeUnorderedBulkOp({useLegacyOps: true});
    }

    var json = record.toJSON()
    logger.silly("Save record %s", record.id)
    if(dbconfig.upsert) {
      batches[record.type]
        .find({ id: json.id })
        .upsert()
        .updateOne({ $set: json });
    }
    else {
      batches[record.type]
        .insert(json);
    }
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
    .then(function() {
      logger.silly("batch saved")
      return Promise.resolve()
    })
}
