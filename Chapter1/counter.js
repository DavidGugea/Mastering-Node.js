const EventEmitter = require("events").EventEmitter;

const Counter = function(i) {
  this.increment = function() {
    i++;
    this.emit('incremented', i);
  }
}

Counter.prototype = new EventEmitter();

const counter = new Counter();
const callback = function(n) {
  console.log(n);
}

counter.addEventListener('incremented', callback);
counter.increment();
counter.increment();
