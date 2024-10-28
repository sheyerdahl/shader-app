import { CanvasHTMLAttributes, useEffect, useRef, useContext, MouseEvent, TouchEvent, useState, CSSProperties, useReducer } from 'react'
import WebGPUHandler from '../../WebGPUHandler'
import Raycast from '../../WorldLogic/Raycast'
import { Vector3 } from '../../WorldLogic/Vector3'
import { DrawCube, DrawObject, DrawRay, DrawVector } from '../../WorldLogic/Debug'
import WorldSettings from '../../WorldLogic/WorldSettings'
import { CameraOffset, CameraRotation, ScreenToCameraDirection } from '../../WorldLogic/Camera'
import SelectedObjects from '../../Context/SelectedObjects'
import { GetCameraViewMatrix, GetDirectionalLightMatrices, GetFrustumCornersWorldSpace } from '../../WorldLogic/WorldState'
import FourDMatrix from '../../Utilities/Matrix'
import { GetVector3Position } from '../../WorldLogic/ObjectUtils'

const gridSize = 32
const rotateSpeed = 1

function Canvas<T extends HTMLCanvasElement>(props: CanvasHTMLAttributes<T>) {
    const [selectedObjects, setSelectedObjects] = useContext(SelectedObjects)
    const canvasSizeRef = useRef([WorldSettings.Width, WorldSettings.Height])
    const [_, forceUpdate] = useReducer((x) => x + 1, 0);
    const canvasRef = useRef(null)
    const canvas2Ref = useRef(null)
    const canvasListRef = useRef([canvasRef, canvas2Ref])
    const handlerRef = useRef<WebGPUHandler | boolean>(false)
    const loadedRef = useRef<boolean>(false)
    const rotateEnabled = useRef<boolean>(false)
    const previousTouch = useRef<[number, number] | undefined>()

    const canvasStyle: CSSProperties = {
        width: canvasSizeRef.current[0],
        height: canvasSizeRef.current[1],
      }

    const StartDrag = () => {
        rotateEnabled.current = true
    }

    const EndDrag = () => {
        rotateEnabled.current = false
        previousTouch.current = undefined
    }

    const RotateCamera = (movementX: number, movementY: number) => {
        const newRotationX = CameraRotation[0] + -movementY * (0.01 * rotateSpeed)
        const newRotationY = CameraRotation[1] + -movementX * (0.01 * rotateSpeed)

        CameraRotation[0] = Math.abs(newRotationX) < Math.PI / 2 ? newRotationX : (newRotationX < 0 ? -Math.PI / 2 : Math.PI / 2)
        CameraRotation[1] = newRotationY
    }

    const HandleMouseMove = async (event: MouseEvent) => {
        if (rotateEnabled.current) {
            RotateCamera(event.movementX, event.movementY)
        }
    }

    const HandleTouchMove = async (event: TouchEvent) => {
        if (rotateEnabled.current) {
            const touch = event.touches[0]

            if (previousTouch.current) {
                const movementX = touch.pageX - previousTouch.current[0]
                const movementY = touch.pageY - previousTouch.current[1]

                RotateCamera(movementX, movementY)
            }

            previousTouch.current = [touch.pageX, touch.pageY]
        }
    }

    const HandleMouseDown = (event: MouseEvent) => {
        // Right click
        if (event.button === 2) {
            StartDrag()
        } else {
            onClick(event)
        }
    }

    const HandleMouseUp = (event: MouseEvent) => {
        // Right click
        if (event.button === 2) {
            EndDrag()
        }
    }

    const HandleTouchStart = (event: TouchEvent) => {
        StartDrag()
    }

    const ResizeCanvases = () => {
        canvasListRef.current.forEach(canvasRef => {
            const canvas = canvasRef.current! as HTMLCanvasElement

            canvas.width = WorldSettings.Width
            canvas.height = WorldSettings.Height
        })
    }

    const onUpdate = async () => {
        let device: GPUDevice
        let handler: WebGPUHandler | boolean = handlerRef.current
        const canvas1 = canvasRef.current! as HTMLCanvasElement
        
        if (handler === false) {
            if (!navigator.gpu) {
                throw new Error("WebGPU not supported on this browser.");
            }

            handlerRef.current = true
            const adapter = await navigator.gpu.requestAdapter()
            if (!adapter) {
                throw new Error("No appropriate GPUAdapter found.");
            }

            device = await adapter.requestDevice()
            const contexts = canvasListRef.current.map(canvasRef => {
                const canvas = canvasRef.current! as HTMLCanvasElement
                const context = canvas.getContext("webgpu")

                if (context === null) {
                    console.warn("Error getting context")
                }

                return context
            }) as GPUCanvasContext[]

            ResizeCanvases()
            handler = new WebGPUHandler(device, contexts, gridSize)
            handlerRef.current = handler
            
            handler.Render()
        } else if (typeof(handler) !== "boolean") {

            if (canvasSizeRef.current[0] !== WorldSettings.Width || canvasSizeRef.current[1] !== WorldSettings.Height) {
                canvasSizeRef.current = [WorldSettings.Width, WorldSettings.Height]
                ResizeCanvases()
                forceUpdate()
            }

            handler.Render()
        }
    }

    const onClick = (event: MouseEvent) => {
        const rayDistance = 100000
        const rayPosition = new Vector3(Array.from(CameraOffset) as [number, number, number])
        
        const screenToCameraDirection = ScreenToCameraDirection([event.nativeEvent.offsetX, event.nativeEvent.offsetY])
        const screenCenter = ScreenToCameraDirection([WorldSettings.Width / 2, WorldSettings.Height / 2])
        // const cameraLookVector = new Vector3(CameraRotation).GetLookVector()
        // const rayDirection = screenToCameraDirection
        const rayDirection = screenCenter

        DrawRay("DirectionRay", rayPosition, rayDirection, rayDistance, [1, 0.1, 0.1, 0.5], 10)

        DrawVector("xAxis", new Vector3([25, 0, 0]), [1, 0, 0, 1])
        DrawVector("yAxis", new Vector3([0, 25, 0]), [0, 1, 0, 1])
        DrawVector("zAxis", new Vector3([0, 0, 25]), [0, 0, 1, 1])

        // GetFrustumCornersWorldSpace().forEach((vector, index) => {
        //     console.log(vector.vector)
        //     DrawRay(`FrustrumCorner${index}`, vector, new Vector3([0, 1, 0]), 150)
        // })

        // View frustrum centers
        const shadowCascadeLevels = WorldSettings.ShadowCascadeLevels
        for (let i = 0; i < shadowCascadeLevels.length + 1; i++) {
            let nearPlane = 0
            let farPlane = 0

            if (i == 0) {
                nearPlane = WorldSettings.CameraNearPlane
                farPlane = shadowCascadeLevels[i]
            } else if (i < shadowCascadeLevels.length) {
                nearPlane = shadowCascadeLevels[i - 1]
                farPlane = shadowCascadeLevels[i]
            } else {
                nearPlane = shadowCascadeLevels[i - 1]
                farPlane = WorldSettings.CameraFarPlane
            }

            const projectionMatrix = new FourDMatrix([]).PerspectiveMatrix(WorldSettings.FOV, WorldSettings.Width, WorldSettings.Height, nearPlane, farPlane)
            const corners = GetFrustumCornersWorldSpace(projectionMatrix, GetCameraViewMatrix())
            let center = new Vector3([0, 0, 0])
            corners.forEach(corner => {
                center = center.AddVector(corner)
            })
            center = center.DivideScalar(corners.length)
            const color = i / (shadowCascadeLevels.length + 1)
            // DrawRay(`FrustrumCenter${i}`, center, new Vector3([0, 1, 0]), 600, [color, color, color, 1], 25)
        }

        // // Light frustrum centers
        GetDirectionalLightMatrices().forEach((lightMatrix, index) => {
            const corners = GetFrustumCornersWorldSpace(lightMatrix)
            // let center = new Vector3([0, 0, 0])
            corners.forEach((corner, cornerIndex) => {
                // center = center.AddVector(corner)
                const color = index / (WorldSettings.ShadowCascadeLevels.length + 1)
                DrawRay(`LightMatrixCorner${index}${cornerIndex}`, corner, new Vector3([0, 1, 0]), 600, [1 - color, color, 0, 1], 75)
            })
            // center = center.DivideScalar(corners.length)
            // const color = index / (WorldSettings.ShadowCascadeLevels.length + 1)
            // DrawRay(`LightMatrixCenter${index}`, center, new Vector3(WorldSettings.LightDirection), 600, [1 - color, color, 0, 1], 75)
        })

        // Light frustrum centers
        // GetDirectionalLightMatrices().forEach((lightMatrix, index) => {
        //     const corners = GetFrustumCornersWorldSpace(lightMatrix)
        //     let center = new Vector3(GetVector3Position(corners.map(vector => vector.vector), "Center"))
        //     let min = new Vector3(GetVector3Position(corners.map(vector => vector.vector), "Min"))
        //     let max = new Vector3(GetVector3Position(corners.map(vector => vector.vector), "Max"))
        //     const color = index / (WorldSettings.ShadowCascadeLevels.length + 1)
        //     // corners.forEach((corner, cornerIndex) => {
        //     //     center = center.AddVector(corner)
        //     //     // const color = index / (WorldSettings.ShadowCascadeLevels.length + 1)
        //     //     // DrawRay(`LightMatrixCorner${index}${cornerIndex}`, corner, new Vector3([0, 1, 0]), 600, [1 - color, color, 0, 1], 75)
        //     // })
        //     // center = center.DivideScalar(corners.length)

        //     // const center = GetObjectCenterPosition(object).vector
        //     // const min = GetObjectMinPosition(object)
        //     // const max = GetObjectMaxPosition(object)
        //     const minMaxVector = min.SubtractVector(max)
        //     const visualScale = [
        //     Math.abs(minMaxVector.vector[0]) + 5,
        //     Math.abs(minMaxVector.vector[1]) + 5,
        //     Math.abs(minMaxVector.vector[2]) + 5,
        //     ] as [number, number, number]

        //     DrawCube(`LightMatrixCube${index}`, center, new Vector3(visualScale), undefined, [1 - color, color, 0, 0.5])
        // })

        const rayData = Raycast(rayPosition, rayDirection, rayDistance)
        // console.log(rayData)
        console.log(CameraRotation)

        if (rayData) {
            const hitDistance = rayPosition.SubtractVector(rayData.HitPosition).GetMagnitude()
            DrawRay("HitRay", rayPosition, rayDirection, hitDistance, [0.1, 0.1, 1, 1])
            setSelectedObjects([rayData.HitObject])
        } else if (selectedObjects.length > 0) {
            setSelectedObjects([])
        }
    }

    useEffect(() => {
        if (!loadedRef.current) {
            loadedRef.current = true
            const renderLoop = () => {
                onUpdate()
                requestAnimationFrame(renderLoop)
            }
            
            renderLoop()
        }
    }, [])

    return (
        <>
            <canvas ref={canvasRef} className='renderer-canvas' style={canvasStyle} {...props} onContextMenu={event => {event.preventDefault()}} onMouseMove={HandleMouseMove} onTouchMove={HandleTouchMove} onMouseDown={HandleMouseDown} onMouseUp={HandleMouseUp} onTouchStart={HandleTouchStart} onTouchEnd={EndDrag}/>
            <canvas ref={canvas2Ref} className='renderer-canvas' style={canvasStyle} {...props} onContextMenu={event => {event.preventDefault()}} onMouseMove={HandleMouseMove} onTouchMove={HandleTouchMove} onMouseDown={HandleMouseDown} onMouseUp={HandleMouseUp} onTouchStart={HandleTouchStart} onTouchEnd={EndDrag}/>
        </>
    )
}

export default Canvas
