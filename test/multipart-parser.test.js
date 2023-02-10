const Stream = require('stream');
const MultipartParser = require('../index');
const assert = require('chai').assert;

describe('MultipartParser', () => {
  let parser;
  let data;
  let parts;
  let end;

  beforeEach(() => {
    parser = new MultipartParser();
    data = '';
    parts = [];
    end = false;
    parser.on('part', (part) => {
      parts.push(part);
    });
    parser.on('end', () => {
      end = true;
    });
  });

  it('parses a multipart message', (done) => {
    const boundary = 'boundary';
    const message = `--${boundary}\r\nContent-Disposition: form-data; name="field1"\r\n\r\ndata1\r\n--${boundary}\r\nContent-Disposition: form-data; name="field2"\r\n\r\ndata2\r\n--${boundary}--`;
    const stream = new Stream.PassThrough();
    stream.pipe(parser);
    stream.end(message);
    parser.on('end', () => {
      assert.equal(parts.length, 2);
      assert.equal(end, true);
      done();
    });
  });

  it('emits an error if the boundary is not found', (done) => {
    const message = 'not a valid multipart message';
    const stream = new Stream.PassThrough();
    stream.pipe(parser);
    stream.end(message);
    parser.on('error', (err) => {
      assert.equal(err.message, "Boundary not found in the data. Code: 1001");
      done();
    });
  });
});

