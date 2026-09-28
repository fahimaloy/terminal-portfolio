/**
 * TubeStrip — a tube of fixed topology whose spine can be rewritten every
 * frame without allocating.
 *
 * The reference implementation this is modelled on rebuilds a whole
 * `THREE.TubeGeometry` per tube per frame. At 60fps with 3 tubes that is 180
 * geometry allocations a second, each with fresh typed arrays, and the GC
 * pressure shows up as frame hitches. This repo has already been bitten by
 * exactly this class of bug (see ParticleField's scratch-vector note).
 *
 * The topology of a tube is constant: `segments * (radialSegments + 1)`
 * vertices in a fixed index order. Only the vertex positions change. So the
 * geometry, the index buffer and the position/normal arrays are allocated ONCE
 * in the constructor, and `update()` writes into the existing arrays and flips
 * `needsUpdate`. Zero allocation in the hot path.
 *
 * Frames are advanced with a parallel-transport ("rotation-minimising") frame
 * rather than three's Frenet frames. Frenet normals flip their sign at
 * inflection points, which makes a tube visibly twist inside out whenever the
 * spine bends through a curve — the exact shape a cursor-chasing tube takes.
 */

import * as THREE from 'three';

const _tangent = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _binormal = new THREE.Vector3();
const _point = new THREE.Vector3();
const _prev = new THREE.Vector3();
const _axis = new THREE.Vector3();

export class TubeStrip {
  readonly geometry: THREE.BufferGeometry;

  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  /** Parameter along the tube, 0..1, used by the shader for the colour ramp. */
  private readonly params: Float32Array;

  private readonly ringVerts: number;
  private readonly spine: Float32Array;
  private readonly radius: number;

  constructor(
    segments: number,
    radialSegments: number,
    radius: number,
    spine: Float32Array,
  ) {
    this.spine = spine;
    this.radius = radius;
    // +1 on the radial axis closes the ring seam with duplicated vertices,
    // which is what lets the shader give each tube a continuous colour ramp
    // without a seam artefact.
    this.ringVerts = radialSegments + 1;

    // `segments + 1` rings, not `segments`. The spine has segments+1 control
    // points and `update()` writes every one of them. Sizing this to
    // `segments` silently dropped the final ring: typed arrays ignore
    // out-of-range writes, so the tube just ended early with no error.
    const vertCount = (segments + 1) * this.ringVerts;
    this.positions = new Float32Array(vertCount * 3);
    this.normals = new Float32Array(vertCount * 3);
    this.params = new Float32Array(vertCount);

    const indices = new Uint16Array((segments - 1) * radialSegments * 6);
    let i = 0;
    for (let s = 0; s < segments - 1; s++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = s * this.ringVerts + r;
        const b = (s + 1) * this.ringVerts + r;
        indices[i++] = a;
        indices[i++] = b;
        indices[i++] = a + 1;
        indices[i++] = a + 1;
        indices[i++] = b;
        indices[i++] = b + 1;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    g.setAttribute('aParam', new THREE.BufferAttribute(this.params, 1));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    // Fixed and generous: the tubes whip across the whole frustum, and a
    // tight recomputed bound would cause popping as the spine moves.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
    this.geometry = g;

    this.update();
  }

  /**
   * Rewrites vertex positions/normals from `this.spine`. Safe to call every
   * frame: no allocation, buffers are reused.
   */
  update(): void {
    const { spine, positions, normals, params, ringVerts, radius } = this;
    const segments = spine.length / 3 - 1;

    let hasFrame = false;

    for (let s = 0; s <= segments; s++) {
      const i3 = s * 3;
      _point.set(spine[i3], spine[i3 + 1], spine[i3 + 2]);

      // Central difference for the tangent; one-sided at the ends.
      const prevIdx = Math.max(0, s - 1) * 3;
      const nextIdx = Math.min(segments, s + 1) * 3;
      _tangent.set(
        spine[nextIdx] - spine[prevIdx],
        spine[nextIdx + 1] - spine[prevIdx + 1],
        spine[nextIdx + 2] - spine[prevIdx + 2],
      );
      if (_tangent.lengthSq() < 1e-12) _tangent.set(0, 0, 1);
      _tangent.normalize();

      if (!hasFrame) {
        // Seed the first frame with whichever axis is least aligned with the
        // tangent — using an axis that is nearly parallel produces a
        // degenerate normal on the first segment.
        _axis.set(
          Math.abs(_tangent.x) < 0.9 ? 1 : 0,
          Math.abs(_tangent.y) < 0.9 ? 1 : 0,
          Math.abs(_tangent.z) < 0.9 ? 1 : 0,
        );
        _normal.copy(_axis).cross(_tangent);
        if (_normal.lengthSq() < 1e-12) _normal.set(1, 0, 0);
        _normal.normalize();
        hasFrame = true;
      } else {
        // Rotation-minimising frame (double reflection is the gold standard,
        // but for a tube of this segment count Gram-Schmidt against the
        // previous normal is stable enough and far cheaper).
        //
        // The correction is to PROJECT the previous normal onto the plane
        // perpendicular to the new tangent: prev - t*(t·prev). Crossing the
        // tangent with the previous normal — the obvious-looking version —
        // yields a vector that is perpendicular but rotated 90° from the
        // minimum, so the tube visibly corkscrews along a straight spine.
        _prev.copy(_normal);
        _normal.copy(_prev).addScaledVector(_tangent, -_prev.dot(_tangent));
        if (_normal.lengthSq() < 1e-12) {
          // Degenerate: the previous normal became parallel to the tangent
          // (a 180° turn). Re-seed on any perpendicular axis.
          _axis.set(
            Math.abs(_tangent.x) < 0.9 ? 1 : 0,
            Math.abs(_tangent.y) < 0.9 ? 1 : 0,
            Math.abs(_tangent.z) < 0.9 ? 1 : 0,
          );
          _normal.copy(_axis).cross(_tangent);
        }
        _normal.normalize();
      }

      _binormal.copy(_tangent).cross(_normal).normalize();

      const t = segments > 0 ? s / segments : 0;
      for (let r = 0; r <= ringVerts - 1; r++) {
        const angle = (r / (ringVerts - 1)) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = _normal.x * cos + _binormal.x * sin;
        const ny = _normal.y * cos + _binormal.y * sin;
        const nz = _normal.z * cos + _binormal.z * sin;

        const v = (s * ringVerts + r) * 3;
        positions[v] = _point.x + nx * radius;
        positions[v + 1] = _point.y + ny * radius;
        positions[v + 2] = _point.z + nz * radius;
        normals[v] = nx;
        normals[v + 1] = ny;
        normals[v + 2] = nz;
        params[s * ringVerts + r] = t;
      }
    }

    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const nrm = this.geometry.getAttribute('normal') as THREE.BufferAttribute;
    const prm = this.geometry.getAttribute('aParam') as THREE.BufferAttribute;
    pos.needsUpdate = true;
    nrm.needsUpdate = true;
    prm.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
