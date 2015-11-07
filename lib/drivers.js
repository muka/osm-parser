var lib = module.exports

var drivers = {
  'mongodb': require('../driver/mongodb')
}

lib.add = function(name, driver) {
  drivers[name] = driver
}

lib.get = function(name) {
  if(drivers[name]) {
    return drivers[name]
  }
  throw new Error("Driver not found: " + name)
}

lib.list = function() {
  return Object.keys(drivers)
}
