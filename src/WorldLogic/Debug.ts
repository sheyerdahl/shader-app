import { Vector3 } from "./Vector3"
import FourDMatrix from "../Utilities/Matrix"
import { GetObjectsByName, NewCube } from "./WorldState"

function DrawRay(name: string, rayPosition: Vector3, rayDirection: Vector3, rayDistance: number, color?: [number, number, number, number], thickness?: number) {
    const end = rayDirection.MultiplyScalar(rayDistance).AddVector(rayPosition)
    const originToEndMatrix = new FourDMatrix([]).lookAt(rayPosition, end)
    const rayRotationEuler = originToEndMatrix.RotationMatrixToEulerAngles()

    let rayObject = GetObjectsByName(name)[0]
    
    if (rayObject === undefined) {
        rayObject = NewCube({Name: name, Scale: [2.5, 2.5, 2.5], Color: color || [1, 1, 1, 1], DontSave: true, IgnoreRaycast: true, IgnoreLighting: true,})
    }

    rayObject.Data.Scale = [thickness || 2.5, thickness || 2.5, rayDistance]
    rayObject.Data.Rotation = [rayRotationEuler[0], rayRotationEuler[1], rayRotationEuler[2]]
    rayObject.Data.Offset = end.SubtractVector(rayPosition).MultiplyScalar(0.5).AddVector(rayPosition).vector
}

function DrawVector(name: string, vector: Vector3, color?: [number, number, number, number], origin?: Vector3, thickness?: number) {
    const originVector = origin || new Vector3([0, 0, 0])
    const end = originVector.AddVector(vector)
    const originToEndMatrix = new FourDMatrix([]).lookAt(originVector, end)
    const rayRotationEuler = originToEndMatrix.RotationMatrixToEulerAngles()
    const direction = new Vector3(rayRotationEuler).GetLookVector()

    DrawRay(name, vector.AddVector(originVector), direction, vector.GetMagnitude(), color, thickness)
}

function DrawCube(name: string, cubePosition: Vector3, cubeScale: Vector3, cubeRotation?: Vector3, color?: [number, number, number, number]) {
    let cubeObject = GetObjectsByName(name)[0]
    
    if (cubeObject === undefined) {
        cubeObject = NewCube({Name: name, Scale: cubeScale.vector, Color: color || [1, 1, 1, 1], Rotation: cubeRotation?.vector, DontSave: true, IgnoreRaycast: true, IgnoreLighting: true})
    }

    cubeObject.Data.Scale = cubeScale.vector
    cubeObject.Data.Rotation = cubeRotation ? cubeRotation.vector : [0, 0, 0]
    cubeObject.Data.Offset = cubePosition.vector
}

function DrawObject(name: string, vertices: number[], index: number[], color?: [number, number, number, number]) {
    let cubeObject = GetObjectsByName(name)[0]
    
    if (cubeObject === undefined) {
        cubeObject = NewCube({Name: name, Scale: [1, 1, 1], Color: color || [1, 1, 1, 1], DontSave: true, IgnoreRaycast: true, IgnoreLighting: true})
    }

    cubeObject.Vertices = Array.from(vertices)
    cubeObject.Index = Array.from(index)
}

export {
    DrawRay,
    DrawVector,
    DrawCube,
    DrawObject,
}