/**
 * 将 ArrayBuffer 转换为 Node.js Buffer。
 * @param {ArrayBuffer} data - 要转换的 ArrayBuffer。
 * @returns {Buffer} 转换后的 Buffer 对象。
 */
export const arraybufferToBuffer = (data: ArrayBuffer) => {
  const buf = new Buffer(data.byteLength);
  const view = new Uint8Array(data);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
};
