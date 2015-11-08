var lib = module.exports

var drivers = {
  'mongodb': require('../driver/mongodb')
}

var Driver = function(name, impl) {
  this.name = name
  this.impl = impl
}
lib.Driver = Driver

Driver.prototype.connect = function(conf) {
  if(this.impl.connect) return this.impl.connect(conf)
  return Promise.resolve()
};

Driver.prototype.disconnect = function() {
  if(this.impl.disconnect) return this.impl.disconnect()
  return Promise.resolve()
};

Driver.prototype.save = function() {
  if(this.impl.save) return this.impl.save.apply(this.impl.save, arguments)
  return Promise.reject(new Error("save method is not implemented for driver " + this.name))
};

lib.add = function(name, driver) {
  drivers[name] = new Driver(name, driver)
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
