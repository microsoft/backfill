import { Transform, TransformCallback } from "stream";

/*
 * Timeout stream, will emit an error event if the
 * input has not started providing data after a given time after
 * its creation.
 */
export class TimeoutStream extends Transform {
  private timeout: NodeJS.Timeout;
  constructor(timeout: number, message: string) {
    super();
    this.timeout = setTimeout(() => {
      this.destroy(new Error(message));
    }, timeout);
  }
  _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    clearTimeout(this.timeout);
    this.push(chunk);
    callback();
  }
}
