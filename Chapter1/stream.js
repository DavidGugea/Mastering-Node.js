let Readable = requiuire('stream').Readable;

let r = new Readable;

let count = 0;

r._read = function() {
  count++;
  if (count > 10) {
    return r.push(null);
  }

  setTimeout(() => r.push(count + '\n'), 500);
}

r.pipe(process.stdout);
