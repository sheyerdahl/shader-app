import { Vector3 } from "./Vector3";
import { ThreeDObject, GetWorldObjects, NewCube } from "./WorldState";
import { GetObjectMaxPosition, GetObjectMinPosition, VerticesToWorldVertices } from "./ObjectUtils";
import { DrawVector } from "./Debug";
import { CameraOffset } from "./Camera";

interface HitData {
    HitPosition: Vector3,
    HitNormal: Vector3,
    HitObject: ThreeDObject
}

interface IObjectTransformationData {
    Offset: [number, number, number],
    Scale: [number, number, number],
    Rotation: [number, number, number],
    WorldVertices: [number, number, number][],
}

type Triangle = [
    [number, number, number],
    [number, number, number],
    [number, number, number]
]

const objectTransformationDatas = new Map<object, IObjectTransformationData>()

let testIndex = 0

export default function Raycast(rayPosition: Vector3, rayDirection: Vector3, rayDistance: number, whiteList?: ThreeDObject[], blackList?: ThreeDObject[]): HitData | undefined {
    // console.time("Raycast")
    const hitDatas: HitData[] = []
    const worldObjects = GetWorldObjects()
    // const rayEnd = rayPosition.AddVector(rayDirection.MultiplyScalar(rayDistance))
    // console.log(rayEnd.SubtractVector(new Vector3(CameraOffset)).vector)
    // DrawVector(`Tesing thing ${testIndex}`, rayEnd.SubtractVector(new Vector3(CameraOffset)), undefined, new Vector3(CameraOffset))
    testIndex++
    // console.log(rayPos.vector)
    // console.log(rayDir.vector)
    
    worldObjects.forEach(object => {
        if ((whiteList && whiteList.indexOf(object) < 0) || (blackList && blackList.indexOf(object) >= 0) || (object.Data.IgnoreRaycast)) {
            return
        }
        // performance.mark("s1 start")
        let objectTransformationData = objectTransformationDatas.get(object)

        if (objectTransformationData === undefined) {
            objectTransformationData = {
                Offset: Array.from(object.Data.Offset) as [number, number, number],
                Scale: Array.from(object.Data.Scale) as [number, number, number],
                Rotation: Array.from(object.Data.Rotation) as [number, number, number],
                WorldVertices: VerticesToWorldVertices(object),
            }

            objectTransformationDatas.set(object, objectTransformationData)
        }

        UpdateObjectTransformationData(object, objectTransformationData)

        const min = GetObjectMinPosition(object, objectTransformationData.WorldVertices)
        const max = GetObjectMaxPosition(object, objectTransformationData.WorldVertices)
        const objectScale = object.Data.Scale[0] + object.Data.Scale[1] + object.Data.Scale[2]
        const boundsOutOfRange = rayPosition.SubtractVector(min).GetMagnitude() > (rayDistance * 2) + objectScale && rayPosition.SubtractVector(max).GetMagnitude() > (rayDistance * 2) + objectScale

        if (boundsOutOfRange) {return}

        const worldVertices = objectTransformationData.WorldVertices

        const triangle: Triangle = [[9, 9, 9], [9, 9, 9], [9, 9, 9]]
        object.Index.forEach((vertexIndex, index) => {
            triangle[index % 3] = worldVertices[vertexIndex]

            if (index % 3 !== 2) {return}

            // Ray-triangle intersection here
            const pointA = new Vector3(triangle[0])
            const pointB = new Vector3(triangle[1])
            const pointC = new Vector3(triangle[2])

            const triEdge1 = pointB.SubtractVector(pointA)
            const triEdge2 = pointC.SubtractVector(pointA)
            const triNormal = triEdge1.CrossProduct(triEdge2).GetUnitVector()
            const planeDotRayDir = triNormal.DotProduct(rayDirection)
            
            if (Math.abs(planeDotRayDir) < 0.0001) {
                return
            }

            const planeDotPointRay = triNormal.DotProduct(pointA.SubtractVector(rayPosition))
            const hitDistance = planeDotPointRay / planeDotRayDir

            if (hitDistance < 0) {return}
            
            const hitPoint = rayPosition.AddVector(rayDirection.MultiplyScalar(hitDistance))

            if (hitPoint.SubtractVector(rayPosition).GetMagnitude() > rayDistance) {return}

            // if (object.Data.Name === "testing1") {
            //     DrawVector("PointAToHitPoint", hitPoint.SubtractVector(pointA), [1, 1, 1, 1], pointA)
            //     DrawVector("PointBToHitPoint", hitPoint.SubtractVector(pointB), [0.75, 0.75, 0.75, 1], pointB)
            //     DrawVector("PointCToHitPoint", hitPoint.SubtractVector(pointC), [0.5, 0.5, 0.5, 1], pointC)
            // }
            const edgeAB = pointB.SubtractVector(pointA)
            const edgeBC = pointC.SubtractVector(pointB)
            const edgeCA = pointA.SubtractVector(pointC)
            const aToHit = hitPoint.SubtractVector(pointA)
            const bToHit = hitPoint.SubtractVector(pointB)
            const cToHit = hitPoint.SubtractVector(pointC)

            const aTestVec = edgeAB.CrossProduct(aToHit).GetUnitVector()
            const bTestVec = edgeBC.CrossProduct(bToHit).GetUnitVector()
            const cTestVec = edgeCA.CrossProduct(cToHit).GetUnitVector()

            const aTestVecMatchesNormal = aTestVec.DotProduct(triNormal) > 0
            const bTestVecMatchesNormal = bTestVec.DotProduct(triNormal) > 0
            const cTestVecMatchesNormal = cTestVec.DotProduct(triNormal) > 0

            if (aTestVecMatchesNormal && bTestVecMatchesNormal && cTestVecMatchesNormal) {
                hitDatas.push({
                    HitPosition: hitPoint,
                    HitNormal: triNormal,
                    HitObject: object,
                })
            }
        })
    })

    hitDatas.sort((a, b) => {
        return a.HitPosition.SubtractVector(rayPosition).GetMagnitude() - b.HitPosition.SubtractVector(rayPosition).GetMagnitude()
    })
    // console.timeEnd("Raycast")
    return hitDatas[0]
}

function ObjectTransformationDataIsDifferent(object: ThreeDObject, oldTransformationData: IObjectTransformationData) {
    const oldValues = [oldTransformationData.Offset, oldTransformationData.Scale, oldTransformationData.Rotation].flat()
    const newValues = [object.Data.Offset, object.Data.Scale, object.Data.Rotation].flat()
    let different = false

    oldValues.forEach((oldValue, index) => {
        if (oldValue !== newValues[index]) {
            different = true
        }
    })
    
    return different
} 

function UpdateObjectTransformationData(object: ThreeDObject, oldTransformationData: IObjectTransformationData) {
    if (ObjectTransformationDataIsDifferent(object, oldTransformationData)) {
        oldTransformationData.Offset = Array.from(object.Data.Offset) as [number, number, number]
        oldTransformationData.Scale = Array.from(object.Data.Scale) as [number, number, number]
        oldTransformationData.Rotation = Array.from(object.Data.Rotation) as [number, number, number]
        oldTransformationData.WorldVertices = VerticesToWorldVertices(object)

        objectTransformationDatas.set(object, oldTransformationData)
    }
}