import type { Wgs84Coordinate } from '../coordinates/types';
export class MapSelection {
  private request = 0;
  private moving = false;
  private candidate: Wgs84Coordinate;
  constructor(center: Wgs84Coordinate) {
    this.candidate = { ...center };
  }
  startRequest(): number {
    return ++this.request;
  }
  cancel(): void {
    this.request++;
  }
  resolve(request: number, value: Wgs84Coordinate): boolean {
    if (request !== this.request) return false;
    this.settle(value);
    return true;
  }
  move(): void {
    this.moving = true;
  }
  settle(value: Wgs84Coordinate): void {
    this.candidate = { ...value };
    this.moving = false;
  }
  confirm(): Wgs84Coordinate | null {
    const { latitude, longitude } = this.candidate;
    return !this.moving &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
      ? { ...this.candidate }
      : null;
  }
}
