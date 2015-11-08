
var osmParser = require('./index')

var options = {
  filename: '../../data/valle-aosta.osm',
  stats: true,
  driver: 'mongodb',
  logLevel: 'info',
  queueSize: 5000,
  mongodb: {
    host: "192.168.77.10",
    port: 27017,
    dbname: 'osm',
    upsert: false,
    dropDb: true,
  }

}

var importer = new osmParser.Importer(options)

importer.on('error', function(e) {
  console.error("Importer error:", e)
  process.exit()
})

importer.start()

importer.on('end', function() {
  importer.printStats()
})

//catches ctrl+c event
process.on('SIGINT', function() {
  importer.end()
  process.exit()
});
