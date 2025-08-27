import { Transform, TransformCallback } from "stream";

/*
 * Sponge stream, it will accumulate all the data it receives
 * and emit it only if and when the input stream sends the "end" event.
 */
export class SpongeStream extends Transform {
  constructor() {
    super({
      // This stream should never receive more data than its readableHighWaterMark
      // otherwise the stream will get into a deadlock
      // 1 TB should give enough room :)
      readableHighWaterMark: 1024 * 1024 * 1024 * 1024,
    });
  }
  _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.pause();
    this.push(chunk);
    callback();
  }
  _flush(callback: TransformCallback): void {
    this.resume();
    callback();
  }
}
