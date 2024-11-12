import { GetCubeObject, ThreeDObject } from "./WorldState"
import WorldSettings from "./WorldSettings"
import { CameraOffset, CameraRotation } from "./Camera"
import FourDMatrix from "../Utilities/Matrix"
import { Vector3 } from "./Vector3"
import { DrawVector } from "./Debug"

export default function DrawCameraRotationVisuals() {
    // const sunScale = [WorldSettings.CameraFarPlane]
    const lookAtMatrix = new FourDMatrix([]).lookAt(new Vector3([0, 0, 0]), new Vector3(WorldSettings.LightDirection))

    const cameraRotationX = new FourDMatrix([]).RotationXMatrix(CameraRotation[0])
    const cameraRotationY = new FourDMatrix([]).RotationYMatrix(CameraRotation[1])
    const cameraRotationZ = new FourDMatrix([]).RotationZMatrix(CameraRotation[2])
    const cameraRotationMatrix = cameraRotationY.Multiply(cameraRotationX).Multiply(cameraRotationZ)
    const rotationEuler = cameraRotationMatrix.RotationMatrixToEulerAngles()

    // const sunOffset = new Vector3(rotationEuler).GetLookVector().MultiplyScalar(15).AddVector(new Vector3(CameraOffset))
    const rightOffset = new Vector3(cameraRotationMatrix.RotationMatrixToRightVector()).MultiplyScalar(10)
    const upOffset = new Vector3(cameraRotationMatrix.RotationMatrixToUpVector()).MultiplyScalar(10)
    const sunOffset = new Vector3(cameraRotationMatrix.RotationMatrixToLookVector()).MultiplyScalar(15).AddVector(new Vector3(CameraOffset)).AddVector(rightOffset).AddVector(upOffset)

    DrawVector("xAxisCameraVisualCORE", new Vector3([2, 0, 0]), [1, 0, 0, 1], sunOffset, 0.3)
    DrawVector("yAxisCameraVisualCORE", new Vector3([0, 2, 0]), [0, 1, 0, 1], sunOffset, 0.3)
    DrawVector("zAxisCameraVisualCORE", new Vector3([0, 0, 2]), [0, 0, 1, 1], sunOffset, 0.3)

    // DrawVector("RightVectorCORE", new Vector3([0, 2.5, 0]).MultiplyScalar(5), [0, 0, 1, 1], sunOffset, 0.5)

    // DrawVector("RightVectorCORE", new Vector3(cameraRotationMatrix.RotationMatrixToLookVector()).MultiplyScalar(5), [0, 0, 1, 1], sunOffset, 0.5)
    // DrawVector("RightVectorCORE", new Vector3(rotationEuler).GetRightVector().MultiplyScalar(5), [0, 0, 1, 1], sunOffset, 0.5)
}