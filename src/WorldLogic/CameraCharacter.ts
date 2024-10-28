import FourDMatrix from "../Utilities/Matrix"
import { CameraOffset, CameraRotation } from "./Camera"
import WorldSettings from "./WorldSettings"
// import Wait from "../Utilities/Wait"
import { Vector3 } from "./Vector3"
import Raycast from "./Raycast"
import { DrawRay } from "./Debug"

export const InputStates: {[key: string]: boolean} = {
    "a": false,
    "d": false,
    "w": false,
    "s": false,
    " ": false,
    "Shift": false,
    "Jumping": false,
}

const keysMaxMomentum: {[key: string]: [number, number, number]} = {
    "a": [-2, 0, 0],
    "d": [2, 0, 0],
    "w": [0, 0, -2],
    "s": [0, 0, 2],
    " ": [0, 2, 0],
    "Shift": [0, -2, 0],
}

const keysMomentum: {[key: string]: [number, number, number]} = {
    "a": [0, 0, 0],
    "d": [0, 0, 0],
    "w": [0, 0, 0],
    "s": [0, 0, 0],
    " ": [0, 0, 0],
    "Shift": [0, 0, 0],
}

const jumpHeight = 3
const upVector = new Vector3([0, 1, 0])
const accelerationFactor = 1.03
const decelerationFactor = 1.03

const groundRayOrigin = new Vector3(CameraOffset)
const groundRayDirection = upVector.GetInverse()
const groundRayDistance = 50

function GroundRay() {
    // DrawRay("GroundRay", groundRayOrigin, groundRayDirection, groundRayDistance, [1, 0, 1, 1])
    return Raycast(groundRayOrigin, groundRayDirection, groundRayDistance)
}

function GravitySimulation() {
    if (!InputStates.Jumping && WorldSettings.Gamemode === "Ingame") {

        const hitData = GroundRay()
        
        if (hitData) {
            const hitDistance = groundRayOrigin.SubtractVector(hitData.HitPosition).GetMagnitude()

            if (hitDistance < groundRayDistance - 5) {
                keysMomentum["Shift"][1] = 2
            } else {
                keysMomentum["Shift"][1] = 0
            }

            StepMovement(new Vector3(keysMomentum["Shift"]))
        } else {
            const currentYVelocity = keysMomentum["Shift"][1]

            keysMomentum["Shift"][1] = Math.max(keysMaxMomentum["Shift"][1] * 2, currentYVelocity - 0.02)
            StepMovement(new Vector3(keysMomentum["Shift"]))
        }
    }
}

setInterval(GravitySimulation, WorldSettings.MoveCooldown)
// GravitySimulation()

export function StartMovement(key: string | React.MutableRefObject<string>) {
    const jumpAction = key === " "
    let keyString = typeof(key) === "string" ? key : key.current
    const shiftInvalid = keyString === "Shift" && WorldSettings.Gamemode === "Ingame"
    
    if (keysMomentum[keyString] === undefined || shiftInvalid) {return}
    
    if (jumpAction && WorldSettings.Gamemode === "Ingame") {
        const characterOnGround = GroundRay() !== undefined
        if (InputStates.Jumping || !characterOnGround) {return}

        InputStates.Jumping = true

        let i = 0
        let intervalId = 0
        intervalId = setInterval(() => {
            if (i >= 50) {
                clearInterval(intervalId)
                InputStates.Jumping = false
            }
            
            keysMomentum[" "][1] = (1 - i / 50) * jumpHeight
            StepMovement(new Vector3(keysMomentum[" "]), true)

            i++
        }, WorldSettings.MoveCooldown)
    } else {
        if (!InputStates[keyString]) {
            InputStates[keyString] = true
            keysMomentum[keyString] = [keysMomentum[keyString][0] + (keysMaxMomentum[keyString][0] / 10), keysMomentum[keyString][1] + (keysMaxMomentum[keyString][1] / 10), keysMomentum[keyString][2] + (keysMaxMomentum[keyString][2] / 10)]
            
            let intervalId = 0
            intervalId = setInterval(() => {
                if (!InputStates[keyString]) {
                    clearInterval(intervalId)
                }
                
                keyString = typeof(key) === "string" ? key : key.current
                const keyMomentum = keysMomentum[keyString]
                const keyMaxMomentum = keysMaxMomentum[keyString]
                const acceleration = WorldSettings.Gamemode === "Edit" ? 99999 : accelerationFactor

                const xMomentum = keyMaxMomentum[0] < 0 ? Math.max(keyMaxMomentum[0], keyMomentum[0] * acceleration) : Math.min(keyMaxMomentum[0], keyMomentum[0] * acceleration)
                const yMomentum = keyMaxMomentum[1] < 0 ? Math.max(keyMaxMomentum[1], keyMomentum[1] * acceleration) : Math.min(keyMaxMomentum[1], keyMomentum[1] * acceleration)
                const zMomentum = keyMaxMomentum[2] < 0 ? Math.max(keyMaxMomentum[2], keyMomentum[2] * acceleration) : Math.min(keyMaxMomentum[2], keyMomentum[2] * acceleration)

                keysMomentum[keyString] = [xMomentum, yMomentum, zMomentum]
                
                StepMovement(new Vector3(keysMomentum[keyString]), true)
            }, WorldSettings.MoveCooldown)
        }
    }
}

export function StepMovement(momentum: Vector3, CollisionCheck?: boolean) {
    const moveSpeedModifier = WorldSettings.Gamemode === "Edit" ? WorldSettings.EditMoveSpeed : WorldSettings.IngameMoveSpeed
    const movementVector = momentum.MultiplyScalar(moveSpeedModifier).vector

    const cameraRotationX = new FourDMatrix([]).RotationXMatrix(WorldSettings.Gamemode === "Edit" ? CameraRotation[0] : 0)
    const cameraRotationY = new FourDMatrix([]).RotationYMatrix(CameraRotation[1])
    const cameraRotationZ = new FourDMatrix([]).RotationZMatrix(WorldSettings.Gamemode === "Edit" ? CameraRotation[2] : 0)
    const movementTranslation = new FourDMatrix([]).TranslationMatrix(movementVector[0], movementVector[1], movementVector[2])
    const cameraMovementMatrix = cameraRotationY.Multiply(cameraRotationX).Multiply(cameraRotationZ).Multiply(movementTranslation)
    
    const xMovement = cameraMovementMatrix.matrix[12]
    const yMovement = cameraMovementMatrix.matrix[13]
    const zMovement = cameraMovementMatrix.matrix[14]

    if (WorldSettings.Gamemode === "Ingame" && CollisionCheck) {
        const origin = new Vector3(CameraOffset)
        const direction = new Vector3([xMovement, yMovement, zMovement]).GetUnitVector()
        const distance = 3
    
        const hitData = Raycast(origin, direction, distance)
        if (hitData) {return}
    }

    CameraOffset[0] += xMovement
    CameraOffset[1] += yMovement
    CameraOffset[2] += zMovement
}

export function StopMovement(key: string) {
    const shiftInvalid = key === "Shift" && WorldSettings.Gamemode === "Ingame"
    if (keysMomentum[key] === undefined || (WorldSettings.Gamemode === "Ingame" && key === " ") || shiftInvalid) {return}
    
    if (InputStates[key] !== undefined) {
        InputStates[key] = false
    }

    let previousMomentum = keysMomentum[key]
    let index = 0
    const intervalId = setInterval(() => {
        if (index === 0) {
            previousMomentum = keysMomentum[key]
        }
        
        if (new Vector3(keysMomentum[key]).GetMagnitude() <= 0.01 || new Vector3(previousMomentum).GetMagnitude() - new Vector3(keysMomentum[key]).GetMagnitude() < 0) {
            clearInterval(intervalId)
        }

        const keyMomentum = keysMomentum[key]
        const keyMaxMomentum = keysMaxMomentum[key]
        const deceleration = WorldSettings.Gamemode === "Edit" ? 99999 : decelerationFactor

        const xMomentum = keyMaxMomentum[0] < 0 ? Math.min(0, keyMomentum[0] / deceleration) : Math.max(0, keyMomentum[0] / deceleration)
        const yMomentum = keyMaxMomentum[1] < 0 ? Math.min(0, keyMomentum[1] / deceleration) : Math.max(0, keyMomentum[1] / deceleration)
        const zMomentum = keyMaxMomentum[2] < 0 ? Math.min(0, keyMomentum[2] / deceleration) : Math.max(0, keyMomentum[2] / deceleration)

        keysMomentum[key] = [xMomentum, yMomentum, zMomentum]
        previousMomentum = keyMomentum
        
        StepMovement(new Vector3(keysMomentum[key]), true)
        index++
    }, WorldSettings.MoveCooldown)
}

export function ResetMomentum() {
    Object.values(keysMomentum).forEach(momentum => {
        momentum[0] = 0
        momentum[1] = 0
        momentum[2] = 0
    })
}