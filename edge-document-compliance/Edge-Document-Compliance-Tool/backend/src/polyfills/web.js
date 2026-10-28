import { Readable } from 'stream';

/**
 * Minimal browser File/Blob polyfills so Node 18 builds continue to run.
 * undici@7 and cheerio expect global File/Blob constructors.
 */

const hasFile = typeof globalThis.File !== 'undefined';
const hasBlob = typeof globalThis.Blob !== 'undefined';

class NodeBlob {
  constructor(parts = [], options = {}) {
    this._parts = parts;
    this.type = options.type || '';
    this.size = parts.reduce((total, part) => {
      if (typeof part === 'string') {
        return total + Buffer.byteLength(part);
      }
      if (part instanceof ArrayBuffer) {
        return total + part.byteLength;
      }
      if (ArrayBuffer.isView(part)) {
        return total + part.byteLength;
      }
      if (Buffer.isBuffer(part)) {
        return total + part.length;
      }
      return total;
    }, 0);
  }

  async arrayBuffer() {
    const buffer = Buffer.concat(
      this._parts.map((part) => {
        if (typeof part === 'string') {
          return Buffer.from(part);
        }
        if (part instanceof ArrayBuffer) {
          return Buffer.from(part);
        }
        if (ArrayBuffer.isView(part)) {
          return Buffer.from(part.buffer, part.byteOffset, part.byteLength);
        }
        if (Buffer.isBuffer(part)) {
          return part;
        }
        return Buffer.alloc(0);
      })
    );
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }

  stream() {
    return Readable.from(
      this._parts.map((part) =>
        typeof part === 'string' ? Buffer.from(part) : part
      )
    );
  }

  async text() {
    const buffers = await this.arrayBuffer();
    return Buffer.from(buffers).toString();
  }
}

class NodeFile extends NodeBlob {
  constructor(parts = [], name = 'file', options = {}) {
    super(parts, options);
    this.name = String(name);
    this.lastModified =
      options.lastModified !== undefined ? options.lastModified : Date.now();
  }
}

if (!hasBlob) {
  // eslint-disable-next-line no-global-assign
  globalThis.Blob = NodeBlob;
}

if (!hasFile) {
  // eslint-disable-next-line no-global-assign
  globalThis.File = NodeFile;

  console.log('[polyfill] Injected Node File/Blob polyfills for legacy runtime');
}

