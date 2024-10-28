import { useEffect, useRef, useContext } from 'react'
import FourDMatrix from '../../Utilities/Matrix'
import { CameraOffset, CameraRotation } from '../../WorldLogic/Camera'
import { Joystick } from 'react-joystick-component'
import { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick'
import { StepMovement } from '../../WorldLogic/CameraCharacter'
import { InputStates, StartMovement, StopMovement } from '../../WorldLogic/CameraCharacter'

const moveCooldown = 5

// function MovementButton(props: {text: string, keyCharacter: " " | "a" | "d" | "w" | "s" | "Shift", startMovement: (key: string) => void, StopMovement: (key: string) => void}) {
//     const key = props.keyCharacter
//     const startMovement = props.startMovement
//     const endMovement = props.endMovement
//     const text = props.text

//     return (
//         <button onMouseDown={() => props.startMovement(key)} onMouseUp={() => endMovement(key)} onTouchStart={() => startMovement(key)} onTouchEnd={() => StopMovement(key)} onContextMenu={(event) => {
//             event.preventDefault()
//         }}>
//             {text}
//         </button>
//     )
// }

function Movement() {
    const didRender = useRef(false)
    const joystickDirection = useRef("w")

    const handleMove = (event: IJoystickUpdateEvent) => {
        const directionMapping = {
            ["LEFT"]: "a",
            ["RIGHT"]: "d",
            ["FORWARD"]: "w",
            ["BACKWARD"]: "s",
        }
        const key = directionMapping[event.direction!]

        if (key !== joystickDirection.current) {
            StopMovement(joystickDirection.current)

            StartMovement(key)
        }
        
        joystickDirection.current = key
    }

    const handleStop = (event: IJoystickUpdateEvent) => {
        StopMovement(joystickDirection.current)
    }

    const handleStart = () => {
        StartMovement(joystickDirection)
    }

    useEffect(() => {
        if (didRender.current) {return}
        didRender.current = true

        document.addEventListener("keydown", (eventData) => {
            if (eventData.repeat) {return}

            const key = eventData.key
            const target = eventData.target as HTMLElement
            
            if (target && target.tagName === 'INPUT') {
                return
            }
            
            StartMovement(key)
        })

        document.addEventListener("keyup", (eventData) => {
            const key = eventData.key
            
            StopMovement(key)
        })
    }, [])

    return (
        <div className='flex mt2'>
            {/* <MovementButton text='Up' keyCharacter=' ' startMovement={StartMovement} StopMovement={StopMovement} />
            <MovementButton text='Down' keyCharacter='Shift' startMovement={StartMovement} StopMovement={StopMovement} />
            <MovementButton text='Left' keyCharacter='a' startMovement={StartMovement} StopMovement={StopMovement} />
            <MovementButton text='Right' keyCharacter='d' startMovement={StartMovement} StopMovement={StopMovement} />
            <MovementButton text='Forward' keyCharacter='w' startMovement={StartMovement} StopMovement={StopMovement} />
            <MovementButton text='Back' keyCharacter='s' startMovement={StartMovement} StopMovement={StopMovement} /> */}
            <Joystick size={100} throttle={moveCooldown} sticky={false} baseColor="#71be71" stickColor="#085127" move={handleMove} stop={handleStop} start={handleStart}></Joystick>
            <br />

            <p className='b mr2 ml3 pt3'>PC Controls:</p>
            <p className='pt3'>W / A / S / D / Space / Left Shift</p>
        </div>
    )
}

export default Movement