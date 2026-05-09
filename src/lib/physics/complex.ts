/**
 * COMPLEX NUMBER UTILITIES
 * 
 * Essential for quantum mechanics calculations
 */

export class Complex {
  constructor(
    public readonly re: number,
    public readonly im: number
  ) {}
  
  static zero(): Complex {
    return new Complex(0, 0);
  }
  
  static one(): Complex {
    return new Complex(1, 0);
  }
  
  static i(): Complex {
    return new Complex(0, 1);
  }
  
  add(other: Complex): Complex {
    return new Complex(this.re + other.re, this.im + other.im);
  }
  
  sub(other: Complex): Complex {
    return new Complex(this.re - other.re, this.im - other.im);
  }
  
  mul(other: Complex): Complex {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }
  
  div(other: Complex): Complex {
    const denom = other.re ** 2 + other.im ** 2;
    if (denom === 0) throw new Error('Division by zero');
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }
  
  scale(s: number): Complex {
    return new Complex(this.re * s, this.im * s);
  }
  
  conjugate(): Complex {
    return new Complex(this.re, -this.im);
  }
  
  magnitude(): number {
    return Math.sqrt(this.re ** 2 + this.im ** 2);
  }
  
  argument(): number {
    return Math.atan2(this.im, this.re);
  }
  
  exp(): Complex {
    const expRe = Math.exp(this.re);
    return new Complex(expRe * Math.cos(this.im), expRe * Math.sin(this.im));
  }
  
  log(): Complex {
    return new Complex(
      Math.log(this.magnitude()),
      this.argument()
    );
  }
  
  pow(n: number): Complex {
    const r = this.magnitude() ** n;
    const theta = this.argument() * n;
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
  
  sqrt(): Complex {
    const r = Math.sqrt(this.magnitude());
    const theta = this.argument() / 2;
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
  
  isZero(): boolean {
    return this.re === 0 && this.im === 0;
  }
  
  equals(other: Complex, tolerance: number = 1e-10): boolean {
    return (
      Math.abs(this.re - other.re) < tolerance &&
      Math.abs(this.im - other.im) < tolerance
    );
  }
  
  toString(): string {
    if (this.im === 0) return `${this.re}`;
    if (this.re === 0) return `${this.im}i`;
    const sign = this.im >= 0 ? '+' : '';
    return `${this.re}${sign}${this.im}i`;
  }
  
  toPolar(): { r: number; theta: number } {
    return {
      r: this.magnitude(),
      theta: this.argument(),
    };
  }
  
  static fromPolar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
  
  static fromReal(re: number): Complex {
    return new Complex(re, 0);
  }
  
  static fromImag(im: number): Complex {
    return new Complex(0, im);
  }
}

/**
 * Complex matrix operations
 */
export class ComplexMatrix {
  constructor(private data: Complex[][]) {}
  
  static identity(n: number): ComplexMatrix {
    const data: Complex[][] = [];
    for (let i = 0; i < n; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < n; j++) {
        row.push(i === j ? Complex.one() : Complex.zero());
      }
      data.push(row);
    }
    return new ComplexMatrix(data);
  }
  
  get rows(): number {
    return this.data.length;
  }
  
  get cols(): number {
    return this.data[0]?.length || 0;
  }
  
  get(row: number, col: number): Complex {
    return this.data[row][col];
  }
  
  add(other: ComplexMatrix): ComplexMatrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error('Matrix dimension mismatch');
    }
    
    const result: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].add(other.data[i][j]));
      }
      result.push(row);
    }
    return new ComplexMatrix(result);
  }
  
  mul(other: ComplexMatrix): ComplexMatrix {
    if (this.cols !== other.rows) {
      throw new Error('Matrix multiplication dimension mismatch');
    }
    
    const result: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < other.cols; j++) {
        let sum = Complex.zero();
        for (let k = 0; k < this.cols; k++) {
          sum = sum.add(this.data[i][k].mul(other.data[k][j]));
        }
        row.push(sum);
      }
      result.push(row);
    }
    return new ComplexMatrix(result);
  }
  
  scale(s: number): ComplexMatrix {
    const result: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].scale(s));
      }
      result.push(row);
    }
    return new ComplexMatrix(result);
  }
  
  conjugate(): ComplexMatrix {
    const result: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].conjugate());
      }
      result.push(row);
    }
    return new ComplexMatrix(result);
  }
  
  transpose(): ComplexMatrix {
    const result: Complex[][] = [];
    for (let j = 0; j < this.cols; j++) {
      const row: Complex[] = [];
      for (let i = 0; i < this.rows; i++) {
        row.push(this.data[i][j]);
      }
      result.push(row);
    }
    return new ComplexMatrix(result);
  }
  
  dagger(): ComplexMatrix {
    return this.transpose().conjugate();
  }
  
  trace(): Complex {
    if (this.rows !== this.cols) {
      throw new Error('Trace only defined for square matrices');
    }
    
    let sum = Complex.zero();
    for (let i = 0; i < this.rows; i++) {
      sum = sum.add(this.data[i][i]);
    }
    return sum;
  }
  
  determinant(): Complex {
    if (this.rows !== this.cols) {
      throw new Error('Determinant only defined for square matrices');
    }
    
    if (this.rows === 1) {
      return this.data[0][0];
    }
    
    if (this.rows === 2) {
      const a = this.data[0][0];
      const b = this.data[0][1];
      const c = this.data[1][0];
      const d = this.data[1][1];
      return a.mul(d).sub(b.mul(c));
    }
    
    // Laplace expansion (simplified for 3x3)
    if (this.rows === 3) {
      const a = this.data;
      return a[0][0].mul(a[1][1].mul(a[2][2]).sub(a[1][2].mul(a[2][1])))
        .sub(a[0][1].mul(a[1][0].mul(a[2][2]).sub(a[1][2].mul(a[2][0]))))
        .add(a[0][2].mul(a[1][0].mul(a[2][1]).sub(a[1][1].mul(a[2][0]))));
    }
    
    throw new Error('Determinant not implemented for matrices > 3x3');
  }
}

export default Complex;