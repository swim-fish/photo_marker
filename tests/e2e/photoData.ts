import { Buffer } from 'node:buffer';
/** Add a synthetic GPS IFD to a real browser-encoded JPEG fixture. */
export function jpegWithGps(jpeg: Buffer, latitude = 25.033, longitude = 121.5654): Buffer {
  const tiff = Buffer.alloc(128);
  tiff.write('II');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  const entry = (offset: number, tag: number, type: number, count: number, value: number) => {
    tiff.writeUInt16LE(tag, offset);
    tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(count, offset + 4);
    tiff.writeUInt32LE(value, offset + 8);
  };
  entry(10, 0x8825, 4, 1, 26);
  tiff.writeUInt16LE(4, 26);
  entry(28, 1, 2, 2, latitude < 0 ? 83 : 78);
  entry(40, 2, 5, 3, 80);
  entry(52, 3, 2, 2, longitude < 0 ? 87 : 69);
  entry(64, 4, 5, 3, 104);
  const dms = (coordinate: number, offset: number) => {
    const value = Math.abs(coordinate),
      degrees = Math.floor(value),
      minutes = Math.floor((value - degrees) * 60),
      seconds = ((value - degrees) * 60 - minutes) * 60;
    [degrees, minutes, seconds].forEach((n, i) => {
      tiff.writeUInt32LE(Math.round(n * 1000000), offset + i * 8);
      tiff.writeUInt32LE(1000000, offset + i * 8 + 4);
    });
  };
  dms(latitude, 80);
  dms(longitude, 104);
  const payload = Buffer.concat([Buffer.from('Exif\0\0'), tiff]),
    segment = Buffer.alloc(4);
  segment.writeUInt16BE(0xffe1);
  segment.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), segment, payload, jpeg.subarray(2)]);
}
