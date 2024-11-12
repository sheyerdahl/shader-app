import './App.css'
import Canvas from './Components/Canvas/Canvas'
import Movement from './Components/Movement/Movement'
import Explorer from './Containers/Explorer/Explorer'
import { useContext, CSSProperties, useEffect, useState, useRef } from 'react'
import { ThreeDObject, AddWorldObject, cube, GetWorldObjects, ClearWorldObjects, NewCube, GetPersistentWorldObjects, ReplaceWorldObjects } from './WorldLogic/WorldState'
import { OBJToObject } from './Utilities/ReadOBJ'
import { CameraOffset } from './WorldLogic/Camera'
import DropDownButton from './Components/DropdownButton/DropdownButton'
import SelectedObjects from './Context/SelectedObjects'
import WorldSettings from './WorldLogic/WorldSettings'
import { ResetMomentum } from './WorldLogic/CameraCharacter'

let loaded = false

function App() {
  const loadedRef = useRef<boolean>(false)
  const [currentGamemode, setCurrentGamemode] = useState<string>(WorldSettings.Gamemode)
  const [currentGamemodeColor, setCurrentGamemodeColor] = useState<string>("blue")
  const [selectedObjects, setSelectedObjects] = useContext(SelectedObjects)
  const [viewScale, setViewScale] = useState("1")
  const [shadowsEnabled, setShadowsEnabled] = useState(WorldSettings.ShadowsEnabled)
  const [rotationVisuals, setRotationVisuals] = useState(WorldSettings.RotationVisuals)
  const [rayVisuals, setRayVisuals] = useState(WorldSettings.RayVisuals)
  const [clearWorldText, setClearWorldText] = useState<"Clear World" | "Are you sure?">("Clear World")
  const [selectedSave, setSelectedSave] = useState("Save 1")
  const [saveDataText, setSaveDataText] = useState("")

  useEffect(() => {
    if (loadedRef.current || loaded) {return}
    loadedRef.current = true
    loaded = true
    console.log("loaded!")

    const savedWorldObjects = localStorage.getItem("WorldObjects")
    const savedViewScale = localStorage.getItem("ViewScale")
    const savedShadowsEnabled = localStorage.getItem("ShadowsEnabled")
    const savedRotationVisuals = localStorage.getItem("RotationVisuals")
    const savedRayVisuals = localStorage.getItem("RayVisuals")

    if (savedShadowsEnabled) {
      setShadowsEnabled(savedShadowsEnabled == 'true' ? true : false)
      WorldSettings.ShadowsEnabled = savedShadowsEnabled == 'true' ? true : false
      setRotationVisuals(savedRotationVisuals == 'true' ? true : false)
      WorldSettings.RotationVisuals = savedRotationVisuals == 'true' ? true : false
      setRayVisuals(savedRayVisuals == 'true' ? true : false)
      WorldSettings.RayVisuals = savedRayVisuals == 'true' ? true : false
    }

    if (savedWorldObjects && savedWorldObjects !== "") {
      ReplaceWorldObjects(savedWorldObjects)
    }

    if (savedViewScale && savedViewScale !== "") {
      setViewScale(savedViewScale)
      UpdateWorldWidthAndHeight(Number(savedViewScale))
    }

    setInterval(() => {
      localStorage.setItem("WorldObjects", JSON.stringify(GetPersistentWorldObjects()))
      localStorage.setItem("ViewScale", String(WorldSettings.Width / 500))
      localStorage.setItem("ShadowsEnabled", String(WorldSettings.ShadowsEnabled))
      localStorage.setItem("RotationVisuals", String(WorldSettings.RotationVisuals))
      localStorage.setItem("RayVisuals", String(WorldSettings.RayVisuals))
    }, 3000)
  }, [])

  const buttonStyle: CSSProperties = {
    marginTop: "15px"
  }

  const OnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {return}

    const file = event.target.files[0]
    const fileReader = new FileReader()
    fileReader.readAsText(file, "UTF-8")

    fileReader.onload = readerEvent => {
      if (!readerEvent.target) {return}

      var content = readerEvent.target.result
      // console.log(content)

      if (typeof(content) === "string") {
        const newObject = OBJToObject(content)
        newObject.Data.Offset = [CameraOffset[0], CameraOffset[1], CameraOffset[2]]

        AddWorldObject(newObject)
        setSelectedObjects([newObject])
      } else {
        console.warn("Unexpected content type")
      }
   }
  }

  const OnClear = () => {
    if (clearWorldText === "Clear World") {
      setClearWorldText("Are you sure?")
      setTimeout(() => {
        setClearWorldText("Clear World")
      }, 3000)
    } else {
      localStorage.setItem("WorldObjects", "")
      ClearWorldObjects()
    }
  }

  const OnToggleGameMode = () => {
    if (WorldSettings.Gamemode === "Edit") {
      ResetMomentum()
      WorldSettings.Gamemode = "Ingame"
      setCurrentGamemodeColor("light-green")
    } else if (WorldSettings.Gamemode === "Ingame") {
      ResetMomentum()
      WorldSettings.Gamemode = "Edit"
      setCurrentGamemodeColor("blue")
    }

    setCurrentGamemode(WorldSettings.Gamemode)
  }

  const onSave = () => {
    localStorage.setItem(`${selectedSave}WorldObjects`, JSON.stringify(GetPersistentWorldObjects()))
  }

  const onLoad = () => {
    const savedWorldObjects = localStorage.getItem(`${selectedSave}WorldObjects`)

    if (savedWorldObjects && savedWorldObjects !== "") {
      ReplaceWorldObjects(savedWorldObjects)
    }
  }

  const onImport = () => {
    if (saveDataText && saveDataText !== "") {
      ReplaceWorldObjects(saveDataText)
    }
  }

  const onExport = () => {
    setSaveDataText(JSON.stringify(GetPersistentWorldObjects()))
  }

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setViewScale(newValue)

    UpdateWorldWidthAndHeight(Number(newValue))
  }

  const onSunShadowsInputChange = () => {
    const newShadowsEnabled = !shadowsEnabled
    setShadowsEnabled(!shadowsEnabled)
    WorldSettings.ShadowsEnabled = newShadowsEnabled
  }

  const onRotationVisualsInputChange = () => {
    WorldSettings.RotationVisuals = !rotationVisuals
    setRotationVisuals(!rotationVisuals)
  }

  const DropDownFunctions = {
    "Cube": () => {
      return NewCube({UseCameraOffset: true, RandomColor: true})
    },

    "Light": () => {
      const originalScale = Array.from(cube.Data.Scale)
      const scale = [originalScale[0] / 2.5, originalScale[1] / 2.5, originalScale[2] / 2.5] as [number, number, number]
  
      const light = NewCube({UseCameraOffset: true, Scale: scale, Name: "Light"})
  
      light.Data.Light = {
        Radius: 750,
        Color: [1, 1, 1, 1],
        Brightness: 1,
      }
      return light
    },

    "Kitty": () => {
      const originalScale = Array.from(cube.Data.Scale)
      const scale = [originalScale[0] * 1.5, originalScale[1] * 1.5, originalScale[2] * 1.5] as [number, number, number]
  
      const kittyCube = NewCube({UseCameraOffset: true, Scale: scale, Name: "Kitty"})
  
      kittyCube.Data.TextureId = 1
      return kittyCube
    },

    "Dog Video": () => {
      const originalScale = Array.from(cube.Data.Scale)
      const scale = [originalScale[0] * 1.5, originalScale[1] * 1.5, originalScale[2] * 1.5] as [number, number, number]
  
      const dogVideoCube = NewCube({UseCameraOffset: true, Scale: scale, Name: "DogVideo"})
  
      dogVideoCube.Data.TextureId = 2
      return dogVideoCube
    },
  }

  const dropDownItems = Object.keys(DropDownFunctions)
  const onItemSelected = (item: string) => {
    const newObject = DropDownFunctions[item as keyof typeof DropDownFunctions]()
    setSelectedObjects([newObject])
  }

  const onSaveSelected = (item: string) => {
    setSelectedSave(item)
  }

  return (
    <>
      <div className='flex'>
        <Explorer />
        <Canvas />
      </div>
      <Movement />

      <p className='b mr'>
        Add Object from .OBJ:
        <input className='ml2 bg-light-red br2' type='file' style={buttonStyle} onChange={OnChange}>
      
      </input>
      </p>

      <div className='flex items-center justify-center'>
        <button className='bg-red' onClick={OnClear}>
          {clearWorldText}
        </button>

        <DropDownButton buttonText='Add Object' onItemSelected={onItemSelected} items={dropDownItems}/>
        
        <button onClick={OnToggleGameMode}>
          Toggle Gamemode
        </button>

        <p className={`w4 h2 b br3 tc v-mid ml2 ${currentGamemodeColor}`}>Gamemode: {currentGamemode}</p>
      </div>

      <div className='flex items-center justify-center'>
        <div className='ml2'>
            <p className='b'>View Scale</p>
            <input className='w3' onChange={onInputChange} value={viewScale} />
          </div>

          <div className='ml2'>
            <p className='b yellow'>Sun Shadows - WIP</p>
            <input className='w4 h1 bg-grey b--grey' type='checkbox' onChange={onSunShadowsInputChange} checked={shadowsEnabled} />
          </div>

          <div className='ml2'>
            <p className='b'>Rotation Visuals</p>
            <input className='w4 h1 bg-grey b--grey' type='checkbox' onChange={onRotationVisualsInputChange} checked={rotationVisuals} />
          </div>

          <div className='ml2'>
            <p className='b'>Ray Visuals</p>
            <input className='w4 h1 bg-grey b--grey' type='checkbox' onChange={() => {WorldSettings.RayVisuals = !rayVisuals; setRayVisuals(!rayVisuals)}} checked={rayVisuals} />
          </div>
      </div>
      
      <div className='flex items-center justify-center mt4'>
        <DropDownButton buttonText={selectedSave} buttonStyle='bg-green' onItemSelected={onSaveSelected} items={["Save 1", "Save 2", "Save 3", "Save 4", "Save 5", "Save 6", "Save 7", "Save 8", "Save 9"]}/>
        
        <button onClick={onSave}> Save </button>
        <button className='bg-dark-blue' onClick={onLoad}> Load </button>
        <button className='bg-dark-green' onClick={onImport}> Import </button>
        <button className='bg-red' onClick={onExport}> Export </button>
        <div className='ml2'>
          <input className=' ml2 w4' onChange={(event) => {setSaveDataText(event.target.value)}} placeholder='SaveData' value={saveDataText} />
        </div>
      </div>
    </>
  )
}

function UpdateWorldWidthAndHeight(scale: number) {
  if (!isNaN(scale)) {
    const clampedValue = Math.min(2, Math.max(0.5, scale))
    
    WorldSettings.Width = 500 * clampedValue
    WorldSettings.Height = 500 * clampedValue
  }
}

export default App
