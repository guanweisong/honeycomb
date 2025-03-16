export const arraybufferToBuffer = (data: ArrayBuffer) => {
  const buf = new Buffer(data.byteLength);
  const view = new Uint8Array(data);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
};
