const Stream = require('stream');

class MultipartParser extends Stream.Transform {
  constructor() {
    super();
    this.boundary = null;
    this.buffer = '';
    this.firstLine = true;
    this.badCharShift = [];
    this.goodSuffixShift = [];
  }

  preprocessBoundary(boundary) {
    const m = boundary.length;
    for (let i = 0; i < 256; i++) {
      this.badCharShift[i] = m;
    }
    for (let i = 0; i < m - 1; i++) {
      this.badCharShift[boundary.charCodeAt(i)] = m - i - 1;
    }
    let lastPrefix = m - 1;
    for (let i = m - 1; i >= 0; i--) {
      if (boundary.slice(0, i + 1) === boundary.slice(m - i - 1)) {
        lastPrefix = i;
      }
      this.goodSuffixShift[i] = lastPrefix + m - i - 1;
    }
    for (let i = 0; i < m - 1; i++) {
      let len = this.borderLength(boundary.slice(0, i + 1));
      this.goodSuffixShift[len] = m - 1 - i;
    }
  }

  borderLength(str) {
    let i = str.length - 1;
    let j = 0;
    while (i >= 0 && str[i] === str[j]) {
      i--;
      j++;
    }
    return j;
  }

  search(data) {
    let i = 0;
    const m = this.boundary.length;
    const n = data.length;
    while (i <= n - m) {
      let j = m - 1;
      while (j >= 0 && this.boundary[j] === data[i + j]) {
        j--;
      }
      if (j < 0) {
        return i;
      }
      i += Math.max(this.goodSuffixShift[j], this.badCharShift[data.charCodeAt(i + j)]);
    }
    return -1;
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    let index = 0;
    while (index < this.buffer.length) {
      if (this.firstLine) {
        this.firstLine = false;
        const lineEnd = this.buffer.indexOf('\r\n');
        if (lineEnd === -1) {
          return;
        }
        const line = this.buffer.slice(0, lineEnd);
        this.buffer = this.buffer.slice(lineEnd + 2);
        if (!line) {
          return callback(new Error("Boundary not found in the data. Code: 1001"));
        }
        this.boundary = `--${line}`;
        this.preprocessBoundary(this.boundary);
        continue;
      }
      index = this.search(this.buffer);
      if (index === -1) {
        break;
      }
      if (this.buffer.slice(index, index + this.boundary.length) === this.boundary) {
        this.emit('part', new Stream.PassThrough());
        this.buffer = this.buffer.slice(index + this.boundary.length);
        continue;
      }
      if (this.buffer.slice(index, index + this.boundary.length + 2) === `${this.boundary}--`) {
        this.emit('end');
        break;
      }
    }
    callback();
  }
}

module.exports = MultipartParser;


