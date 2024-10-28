export class Vector3 {
    vector: [number, number, number]

    constructor(vector: [number, number, number]) {
        this.vector = vector
    }

    GetMagnitude() {
        return Math.sqrt(Math.pow(this.vector[0], 2) + Math.pow(this.vector[1], 2) + Math.pow(this.vector[2], 2))
    }

    GetUnitVector() {
        const v = this.vector
        const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        // make sure we don't divide by 0.
        if (length > 0.00001) {
            return new Vector3([
                v[0] / length,
                v[1] / length,
                v[2] / length
            ])
        } else {
            return new Vector3([
                0,
                0,
                0
            ])
        }
    }

    GetLookVector() {
        const eulerAngles = this.vector
        
        const lookVectorX = -Math.sin(eulerAngles[1])
        const lookVectorY = (Math.sin(eulerAngles[0]) * Math.cos(eulerAngles[1]))
        const lookVectorZ = -(Math.cos(eulerAngles[0]) * Math.cos(eulerAngles[1]))

        return new Vector3([lookVectorX, lookVectorY, lookVectorZ])
    }

    GetInverse() {
        return new Vector3([-this.vector[0], -this.vector[1], -this.vector[2]])
    }

    MultiplyScalar(scalar: number) {
        const vector = this.vector

        return new Vector3([vector[0] * scalar, vector[1] * scalar, vector[2] * scalar])
    }

    DivideScalar(scalar: number) {
        const vector = this.vector

        return new Vector3([vector[0] / scalar, vector[1] / scalar, vector[2] / scalar])
    }

    AddVector(secondVector: Vector3) {
        return new Vector3([this.vector[0] + secondVector.vector[0], this.vector[1] + secondVector.vector[1], this.vector[2] + secondVector.vector[2]])
    }

    SubtractVector(secondVector: Vector3) {
        return new Vector3([this.vector[0] - secondVector.vector[0], this.vector[1] - secondVector.vector[1], this.vector[2] - secondVector.vector[2]])
    }

    MultiplyVector(secondVector: Vector3) {
        return new Vector3([this.vector[0] * secondVector.vector[0], this.vector[1] * secondVector.vector[1], this.vector[2] * secondVector.vector[2]])
    }

    DotProduct(secondVector: Vector3) {
        return (this.vector[0] * secondVector.vector[0]) + (this.vector[1] * secondVector.vector[1]) + (this.vector[2] * secondVector.vector[2])
    }

    CrossProduct(secondVector: Vector3) {
        const x = (this.vector[1] * secondVector.vector[2]) - (this.vector[2] * secondVector.vector[1])
        const y = (this.vector[2] * secondVector.vector[0]) - (this.vector[0] * secondVector.vector[2])
        const z = (this.vector[0] * secondVector.vector[1]) - (this.vector[1] * secondVector.vector[0])

        return new Vector3([x, y, z])
    }
}