var file = '../../data/valle-aosta.osm'


var Queue = require('./lib/queue')
var OsmParser = require('./lib/parser')
var drivers = require('./lib/drivers')

var parser = new OsmParser()
var queue = new Queue()

parser.on('error', function(e) {
  console.error(e)
})

parser.on('record', function(record) {
  // console.info(JSON.stringify(record))
  queue.set(record)
})

parser.on('end', function() {
  queue.emit('end')
  parser.printStats()
  console.log("\nCompleted!");
})

parser.fromFile(file)

var i = 0
queue.on('batch', function() {
  i++
  var x = i
  // console.log("Batch "+x);
  drivers.get('mongodb').save(queue.get())
    .then(function() {
      // console.log("Batch saved "+x);
    })
    .catch(function(e) {
      console.error(e);
      process.exit()
    })
})

//catches ctrl+c event
process.on('SIGINT', function() {
  try {
    parser.end()
    parser.printStats()
  }
  catch(e) {
    console.warn(e)
  }

  process.exit()
});
