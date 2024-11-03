import { GetCubeObject, ThreeDObject } from "./WorldState"
import WorldSettings from "./WorldSettings"
import { CameraOffset, CameraRotation } from "./Camera"
import FourDMatrix from "../Utilities/Matrix"
import { Vector3 } from "./Vector3"

export default function GetSunObject() {
    // const sunScale = [WorldSettings.CameraFarPlane]
    const lookAtMatrix = new FourDMatrix([]).lookAt(new Vector3([0, 0, 0]), new Vector3(WorldSettings.LightDirection))
    const rotationEuler = lookAtMatrix.RotationMatrixToEulerAngles()
    const sunScale = [2000, 2000, 25] as [number, number, number]
    const sunObject = GetCubeObject({DontSave: true, IgnoreLighting: true, DontCastShadow: true, IgnoreRaycast: true, Scale: sunScale, Rotation: rotationEuler, Color: [0.9, 0.9, 0.9, 1]})
    sunObject.Data.TextureId = 6
    sunObject.Data.Name = "Sun"

    const sunOffset = new Vector3(rotationEuler).GetLookVector().MultiplyScalar(WorldSettings.CameraFarPlane - 50).AddVector(new Vector3(CameraOffset))
    sunObject.Data.Offset = sunOffset.vector
    // new FourDMatrix([]).RotationMatrixToEulerAngles()


    return sunObject
}