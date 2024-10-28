import { ThreeDObject } from "./WorldState"
import FourDMatrix from "../Utilities/Matrix"
import { Vector3 } from "./Vector3"
import { DrawRay, DrawVector } from "./Debug"

export function VerticesToWorldVertices(object: ThreeDObject): [number, number, number][] {
    const vertices = object.Vertices

    const translationMatrix = new FourDMatrix([]).TranslationMatrix(object.Data.Offset[0], object.Data.Offset[1], object.Data.Offset[2])
    const scalingMatrix = new FourDMatrix([]).ScalingMatrix(object.Data.Scale[0], object.Data.Scale[1], object.Data.Scale[2])
    const rotationMatrixZ = new FourDMatrix([]).RotationZMatrix(object.Data.Rotation[2])
    const rotationMatrixY = new FourDMatrix([]).RotationYMatrix(object.Data.Rotation[1])
    const rotationMatrixX = new FourDMatrix([]).RotationXMatrix(object.Data.Rotation[0])

    const worldTransformationMatrix = translationMatrix.Multiply(rotationMatrixX).Multiply(rotationMatrixY).Multiply(rotationMatrixZ).Multiply(scalingMatrix)
    const worldVertices: [number, number, number][] = []

    vertices.forEach((vertex, index) => {
        const i = index % 3

        if (i === 0) {
            worldVertices.push([0, 0, 0])
        }
        
        worldVertices[Math.floor(index / 3)][i] = vertex
    })

    return worldVertices.map((vertex, index) => {
        const vertexMatrix = new FourDMatrix([]).TranslationMatrix(vertex[0], vertex[1], vertex[2])
        const worldVertexMatrix = worldTransformationMatrix.Multiply(vertexMatrix)
        
        return [worldVertexMatrix.matrix[12], worldVertexMatrix.matrix[13], worldVertexMatrix.matrix[14]]
    })
}

export function GetObjectCenterPosition(object: ThreeDObject, worldVertices?: [number, number, number][]) {
    if (worldVertices === undefined) {
        worldVertices = VerticesToWorldVertices(object)
    }

    return new Vector3(GetVector3Position(worldVertices, "Center"))
}

export function GetObjectMinPosition(object: ThreeDObject, worldVertices?: [number, number, number][]) {
    if (worldVertices === undefined) {
        worldVertices = VerticesToWorldVertices(object)
    }

    return new Vector3(GetVector3Position(worldVertices, "Min"))
}

export function GetObjectMaxPosition(object: ThreeDObject, worldVertices?: [number, number, number][]) {
    if (worldVertices === undefined) {
        worldVertices = VerticesToWorldVertices(object)
    }

    return new Vector3(GetVector3Position(worldVertices, "Max"))
}

export function GetVector3Position(vector3List: [number, number, number][], position: "Min" | "Center" | "Max"): [number, number, number] {
    let min: [number, number, number] = [9999999999, 9999999999, 9999999999]
    let max: [number, number, number] = [-9999999999, -9999999999, -9999999999]

    vector3List.forEach((vector, index) => {
        // const vectorPositionSum = vector[0] + vector[1] + vector[2]
        // const minPositionSum = min[0] + min[1] + min[2]
        // const maxPositionSum = max[0] + max[1] + max[2]

        // if (vectorPositionSum < minPositionSum) {
        //     min = vector
        // }

        // if (vectorPositionSum > maxPositionSum) {
        //     max = vector
        // }
        for (let i = 0; i < 3; i++) {
            if (vector[i] < min[i]) {
                min[i] = vector[i]
            }

            if (vector[i] > max[i]) {
                max[i] = vector[i]
            }
        }
    })

    const maxMin = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
    const maxMinHalf = [maxMin[0] / 2, maxMin[1] / 2, maxMin[2] / 2]
    const center = [maxMinHalf[0] + min[0], maxMinHalf[1] + min[1], maxMinHalf[2] + min[2]] as [number, number, number]

	const returnValues = {
        "Min": min,
        "Max": max,
        "Center": center,
    }

    return returnValues[position]
}