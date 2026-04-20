export interface AnimationClip {
  name: string;
  duration: number;
  tracks: {
    boneName: string;
    property: 'position' | 'rotation' | 'scale';
    times: Float32Array;
    values: Float32Array;
  }[];
}

export class AnimationExtractor {
  // Extracts a simple center-of-mass trajectory from a sequence of field snapshots
  static extractTrajectory(snapshots: {time: number, field: Float32Array}[], dims: [number, number, number]): AnimationClip {
    const [nx, ny, nz] = dims;
    const times = new Float32Array(snapshots.length);
    const positions = new Float32Array(snapshots.length * 3);
    
    for (let s = 0; s < snapshots.length; s++) {
      const snap = snapshots[s];
      times[s] = snap.time;
      
      let sumX = 0, sumY = 0, sumZ = 0, totalMass = 0;
      
      for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) {
          for (let z = 0; z < nz; z++) {
            const val = snap.field[x * ny * nz + y * nz + z];
            if (val > 0.01) { // Threshold to ignore noise
              sumX += x * val;
              sumY += y * val;
              sumZ += z * val;
              totalMass += val;
            }
          }
        }
      }
      
      if (totalMass > 0) {
        positions[s * 3] = (sumX / totalMass) - nx / 2;
        positions[s * 3 + 1] = (sumY / totalMass) - ny / 2;
        positions[s * 3 + 2] = (sumZ / totalMass) - nz / 2;
      } else {
        positions[s * 3] = 0;
        positions[s * 3 + 1] = 0;
        positions[s * 3 + 2] = 0;
      }
    }
    
    return {
      name: "FieldTrajectory",
      duration: times[times.length - 1],
      tracks: [
        {
          boneName: "Root",
          property: "position",
          times: times,
          values: positions
        }
      ]
    };
  }
}
