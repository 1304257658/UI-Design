/** Educational numeric timeline. Independent of Anime.js, intentionally small.
 * No DOM dependency, incremental position accumulation, or per-track RAF loops.
 * Not a production engine: no units, colors, spring solver or composition modes.
 */
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export const eases = {
  linear: t => t,
  inOutCubic: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  outBack: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
};

export class Timeline {
  constructor({duration, tracks, render = () => {}, request = cb => requestAnimationFrame(cb), cancel = id => cancelAnimationFrame(id)}) {
    if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('duration must be finite and positive');
    const keys = new Set();
    for (const t of tracks) {
      if (keys.has(t.key)) throw new Error('This learning engine allows one track per property');
      keys.add(t.key);
      if (![t.start, t.end, t.from, t.to].every(Number.isFinite) || t.start < 0 || t.end <= t.start || t.end > duration) {
        throw new RangeError('Invalid track interval or numeric value');
      }
      if (t.ease && !eases[t.ease]) throw new Error('Unknown easing');
    }
    Object.assign(this, {duration, tracks: tracks.map(t => ({...t})), render, request, cancel});
    this.time = 0;
    this.speed = 1;
    this.playing = false;
    this.disposed = false;
    this.frame = null;
    this.previous = null;
    this.tick = this.tick.bind(this);
    this.seek(0);
  }
  sample(time) {
    if (!Number.isFinite(time)) throw new RangeError('time must be finite');
    const result = {};
    for (const t of this.tracks) {
      const progress = clamp((time - t.start) / (t.end - t.start), 0, 1);
      result[t.key] = t.from + (t.to - t.from) * eases[t.ease || 'linear'](progress);
    }
    return result;
  }
  seek(time) {
    if (this.disposed) return this;
    if (!Number.isFinite(time)) throw new RangeError('time must be finite');
    this.time = clamp(time, 0, this.duration);
    this.render(this.sample(this.time), this.time);
    // A seek rebases the clock so the next frame cannot reuse the old delta.
    this.previous = null;
    return this;
  }
  play() {
    if (this.disposed || this.playing) return this;
    this.playing = true;
    this.previous = null;
    this.frame = this.request(this.tick);
    return this;
  }
  pause() {
    this.playing = false;
    if (this.frame !== null) this.cancel(this.frame);
    this.frame = null;
    this.previous = null;
    return this;
  }
  setSpeed(speed) {
    if (!Number.isFinite(speed) || speed === 0) throw new RangeError('Use pause() for zero speed');
    this.speed = speed;
    this.previous = null;
    return this;
  }
  tick(now) {
    this.frame = null;
    if (!this.playing || this.disposed) return;
    const delta = this.previous === null ? 0 : Math.max(0, now - this.previous);
    this.previous = now;
    this.time = clamp(this.time + delta * this.speed, 0, this.duration);
    this.render(this.sample(this.time), this.time);
    if ((this.speed > 0 && this.time === this.duration) || (this.speed < 0 && this.time === 0)) this.pause();
    else this.frame = this.request(this.tick);
  }
  dispose() {
    this.pause();
    this.disposed = true;
    this.render = () => {};
  }
}
