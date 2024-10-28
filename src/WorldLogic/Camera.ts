import { Vector3 } from "./Vector3";
import WorldSettings from "./WorldSettings";
import FourDMatrix from "../Utilities/Matrix";

const CameraOffset: [number, number, number] = [0, 0, 0]
const CameraRotation: [number, number, number] = [0, 0, 0]

function ScreenToCameraDirection(screenPos: [number, number]) {
    // Remap so (0, 0) is the center of the window,
    // and the edges are at -0.5 and +0.5.
    const aspect = WorldSettings.Width / WorldSettings.Height
    const relative = new Vector3([
            (WorldSettings.Width - screenPos[0]) / WorldSettings.Width - 0.5,
            screenPos[1] / WorldSettings.Height - 0.5,
            1,
    ])

    // Angle in radians from the view axis
    // to the top plane of the view pyramid.
    const verticalAngle = 0.5 * (WorldSettings.FOV * Math.PI / 180)

    // World space height of the view pyramid
    // measured at 1 m depth from the camera.
    const worldHeight = 2 * Math.tan(verticalAngle)

    // Convert relative position to world units.
    const worldUnits = relative.MultiplyScalar(worldHeight)
    worldUnits.vector[0] *= aspect
    worldUnits.vector[2] = 1

    // Rotate to match camera orientation.
    const cameraRotationX = new FourDMatrix([]).RotationXMatrix(CameraRotation[0])
    const cameraRotationY = new FourDMatrix([]).RotationYMatrix(CameraRotation[1])
    const cameraRotationZ = new FourDMatrix([]).RotationZMatrix(CameraRotation[2])
    const cameraRotationMatrix = cameraRotationY.Multiply(cameraRotationX).Multiply(cameraRotationZ)
    const worldUnitsMatrix = new FourDMatrix([]).TranslationMatrix(worldUnits.vector[0], worldUnits.vector[1], worldUnits.vector[2])
    const directionMatrix = cameraRotationMatrix.Multiply(worldUnitsMatrix) 
    const direction = new Vector3([directionMatrix.matrix[12], directionMatrix.matrix[13], directionMatrix.matrix[14]]).GetUnitVector().GetInverse()

    return direction
}

export {
    CameraOffset,
    CameraRotation,
    ScreenToCameraDirection,
}