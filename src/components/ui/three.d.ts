declare module 'three' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    order: string;
  }

  export class Object3D {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    children: Object3D[];
    add(child: Object3D): this;
    remove(child: Object3D): this;
  }

  export class Group extends Object3D {}

  export class Mesh extends Object3D {
    geometry: BufferGeometry;
    material: Material | Material[];
  }

  export class BufferGeometry {
    args?: any[];
  }

  export class Material {
    color?: string;
    opacity?: number;
    transparent?: boolean;
    blending?: number;
  }

  export class MeshBasicMaterial extends Material {}
  export class PlaneGeometry extends BufferGeometry {
    args?: any[];
  }
  export class BoxGeometry extends BufferGeometry {
    args?: any[];
  }
  export class CylinderGeometry extends BufferGeometry {
    args?: any[];
  }
  export class SphereGeometry extends BufferGeometry {
    args?: any[];
  }

  export const AdditiveBlending: number;
}

// THREE namespace for global THREE syntax
declare global {
  namespace THREE {
    type Group = import('./three').Group;
    type Mesh = import('./three').Mesh;
    type Object3D = import('./three').Object3D;
    type Vector3 = import('./three').Vector3;
    type Euler = import('./three').Euler;
    type BufferGeometry = import('./three').BufferGeometry;
    type Material = import('./three').Material;
    type MeshBasicMaterial = import('./three').MeshBasicMaterial;
    type PlaneGeometry = import('./three').PlaneGeometry;
    type BoxGeometry = import('./three').BoxGeometry;
    type CylinderGeometry = import('./three').CylinderGeometry;
    type SphereGeometry = import('./three').SphereGeometry;
    const AdditiveBlending: number;
    class DirectionalLight {
      constructor(color?: string, intensity?: number);
      position: Vector3;
    }
    class AmbientLight {
      constructor(color?: string, intensity?: number);
    }
    class Scene {}
    class Clock {
      getElapsedTime(): number;
    }
  }
}
