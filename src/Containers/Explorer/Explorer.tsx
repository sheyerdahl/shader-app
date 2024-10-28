import { CSSProperties, useContext, useEffect, useState } from 'react'
import { NewCube, DeleteObjectsByInternalName, DeleteObjectsByObjects, ThreeDObject, AddWorldObject } from '../../WorldLogic/WorldState'
import SelectedObjects from '../../Context/SelectedObjects'
import WorldSettings from '../../WorldLogic/WorldSettings'
import { GetObjectCenterPosition, GetObjectMaxPosition, GetObjectMinPosition, VerticesToWorldVertices } from '../../WorldLogic/ObjectUtils'
import { DrawRay, DrawVector } from '../../WorldLogic/Debug'
import { Vector3 } from '../../WorldLogic/Vector3'

interface ObjectDataInputValues {
  Color: [string, string, string, string],
  Offset: [string, string, string],
  Scale: [string, string, string],
  Rotation: [string, string, string],
  Name: string,
  IsPointLight: boolean,
  Light: {
      Radius: string,
      Color: [string, string, string, string],
      Brightness: string,
  },
  TextureId: string,
  IgnoreLighting?: boolean,
}

type InputChangeKeyProp = "Color" | "Offset" | "Scale" | "Rotation" | "Name" | "IsPointLight" | "Light" | "TextureId" | "IgnoreLighting"
type InputChangeSubKeyProp = "Radius" | "Color" | "Brightness"

const defaultObjectDataInputValues: ObjectDataInputValues = {
  Color: ["0", "0", "0", "1"],
  Offset: ["0", "0", "0"],
  Scale: ["1", "1", "1"],
  Rotation: ["0", "0", "0"],
  Name: "???",
  IsPointLight: false,
  Light: {
      Radius: "0",
      Color: ["1", "1", "1", "1"],
      Brightness: "1",
  },
  TextureId: "0",
  IgnoreLighting: false,
}

function Explorer() {
  const [selectedObjects, setSelectedObjects] = useContext(SelectedObjects)
  const [inputValues, setInputValues] = useState<ObjectDataInputValues>(defaultObjectDataInputValues)
  const mainDivStyle: CSSProperties = {
    overflowY: "scroll",
    height: WorldSettings.Height,
  }

  const UpdateSelectedObjectVisuals = () => {
    DeleteObjectsByInternalName("SelectedObjectVisual")

    selectedObjects.forEach(object => {
      const visualOffset = GetObjectCenterPosition(object).vector
      const min = GetObjectMinPosition(object)
      const max = GetObjectMaxPosition(object)
      const minMaxVector = min.SubtractVector(max)
      const visualScale = [
        Math.abs(minMaxVector.vector[0]) + 5,
        Math.abs(minMaxVector.vector[1]) + 5,
        Math.abs(minMaxVector.vector[2]) + 5,
      ] as [number, number, number]

      // DrawRay("MinRay", min, new Vector3([0, 1, 0]), 200, [1, 1, 0, 1])
      // DrawRay("MaxRay", max, new Vector3([0, 1, 0]), 200, [1, 0, 1, 1])
      // DrawVector("MinMaxVector", minMaxVector, undefined, max)

      const objectVisual = NewCube({Offset: visualOffset, Scale: visualScale, DontSave: true, IgnoreRaycast: true, IgnoreLighting: true, Color: [0, 0.917, 1, 0.1],})
      objectVisual.Data.DontShowInExplorer = true
      objectVisual.Data.InternalName = "SelectedObjectVisual"
    })
  }

  useEffect(() => {
    UpdateSelectedObjectVisuals()

    const object = selectedObjects[0]
    if (object === undefined) {return}

    setInputValues({
      Color: [object.Data.Color[0].toString(), object.Data.Color[1].toString(), object.Data.Color[2].toString(), object.Data.Color[3].toString()],
      Offset: [object.Data.Offset[0].toString(), object.Data.Offset[1].toString(), object.Data.Offset[2].toString()],
      Scale: [object.Data.Scale[0].toString(), object.Data.Scale[1].toString(), object.Data.Scale[2].toString()],
      Rotation: [(object.Data.Rotation[0] / (Math.PI / 180)).toString(), (object.Data.Rotation[1] / (Math.PI / 180)).toString(), (object.Data.Rotation[2] / (Math.PI / 180)).toString()],
      Name: object.Data.Name,
      IsPointLight: object.Data.Light && object.Data.Light.Radius >= 1 ? true : false,
      Light: {
          Radius: object.Data.Light ? object.Data.Light.Radius.toString() : "0",
          Color: object.Data.Light ? [object.Data.Light.Color[0].toString(), object.Data.Light.Color[1].toString(), object.Data.Light.Color[2].toString(), object.Data.Light.Color[3].toString()] : ["1", "1", "1", "1"],
          Brightness: object.Data.Light ? object.Data.Light.Brightness.toString() : "1",
      },
      TextureId: object.Data.TextureId ? object.Data.TextureId.toString() : "0",
      IgnoreLighting: object.Data.IgnoreLighting || false,
    })
  }, [selectedObjects])

  const onDelete = () => {
    DeleteObjectsByObjects(selectedObjects)
    setSelectedObjects([])
  }

  const onDuplicate = () => {
    const newSelectedObjects: ThreeDObject[] = []

    selectedObjects.forEach(object => {
      const objectClone = structuredClone(object)
      objectClone.Data.Offset[1] += 5

      AddWorldObject(objectClone)
      newSelectedObjects.push(objectClone)
    })

    setSelectedObjects(newSelectedObjects)
  }

  const updateSelectedObjectsData = (newInputValues: ObjectDataInputValues) => {
    selectedObjects.forEach(object => {
      const objectData = object.Data

      objectData.Color = [Number(newInputValues.Color[0]), Number(newInputValues.Color[1]), Number(newInputValues.Color[2]), Number(newInputValues.Color[3])]
      objectData.Offset = [Number(newInputValues.Offset[0]), Number(newInputValues.Offset[1]), Number(newInputValues.Offset[2])]
      objectData.Scale = [Number(newInputValues.Scale[0]), Number(newInputValues.Scale[1]), Number(newInputValues.Scale[2])]
      objectData.Rotation = [Number(newInputValues.Rotation[0]) * Math.PI / 180, Number(newInputValues.Rotation[1]) * Math.PI / 180, Number(newInputValues.Rotation[2]) * Math.PI / 180]
      objectData.Name = newInputValues.Name
      objectData.Light = newInputValues.IsPointLight ? {
        Radius: Number(newInputValues.Light.Radius),
        Color: [Number(newInputValues.Light.Color[0]), Number(newInputValues.Light.Color[1]), Number(newInputValues.Light.Color[2]), Number(newInputValues.Light.Color[3])],
        Brightness: Number(newInputValues.Light.Brightness),
      } : undefined
      objectData.TextureId = Number(newInputValues.TextureId)
      objectData.IgnoreLighting = newInputValues.IgnoreLighting
    })

    UpdateSelectedObjectVisuals()
  }

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>, key: InputChangeKeyProp, index?: number, subKey?: InputChangeSubKeyProp) => {
    const newInputValues = structuredClone(inputValues)
    const newValue = typeof(newInputValues[key]) === "boolean" ? event.target.checked : event.target.value

    if (key === "Light" && subKey) {
      if (subKey === "Color" && index !== undefined) {
        newInputValues[key][subKey][index] = newValue as string
      } else if (subKey !== "Color") {
        newInputValues[key][subKey] = newValue as string
      }
    } else if (index !== undefined) {
      (newInputValues[key] as [string, string, string, string] | [string, string, string])[index] = newValue as string
    } else {
      (newInputValues[key] as string | boolean) = newValue
    }
    // TODO: make the rest of the inputs use this function
    setInputValues(newInputValues)
    updateSelectedObjectsData(newInputValues)
  }

  return (
    <>
      <div className={`mr2 bg-navy br4 ${selectedObjects.length > 0 ? "o-100" : "o-0"} `} style={mainDivStyle}>
        <div className='flex justify-center mt1'>
          <button onClick={onDelete}>
            Delete
          </button>
          <button onClick={onDuplicate}>
            Duplicate
          </button>
        </div>
        <div>
          <p className='mb1 b'>Name</p>
          <input className='w4 bg-grey b--grey' onChange={(e) => {onInputChange(e, "Name")}} value={inputValues.Name} />
        </div>
        <div>
          <p className='mb1 b'>Color</p>
          <input className='w2 bg-red b--red' onChange={(e) => {onInputChange(e, "Color", 0)}} value={inputValues.Color[0].slice(0, 4)} />
          <input className='w2 bg-green b--green' onChange={(e) => {onInputChange(e, "Color", 1)}} value={inputValues.Color[1].slice(0, 4)} />
          <input className='w2 bg-blue b--blue' onChange={(e) => {onInputChange(e, "Color", 2)}} value={inputValues.Color[2].slice(0, 4)} />
          <input className='w2 bg-grey b--grey' onChange={(e) => {onInputChange(e, "Color", 3)}} value={inputValues.Color[3].slice(0, 4)} />
        </div>
        <div>
          <p className='mb1 b'>Position</p>
          <input className='w3 bg-dark-red b--dark-red' onChange={(e) => {onInputChange(e, "Offset", 0)}} value={inputValues.Offset[0].slice(0, inputValues.Offset[0].indexOf(".") > -1 ? inputValues.Offset[0].indexOf(".") : 7)} />
          <input className='w3 bg-dark-green b--dark-green' onChange={(e) => {onInputChange(e, "Offset", 1)}} value={inputValues.Offset[1].slice(0, inputValues.Offset[1].indexOf(".") > -1 ? inputValues.Offset[1].indexOf(".") : 7)} />
          <input className='w3 bg-dark-blue b--dark-blue' onChange={(e) => {onInputChange(e, "Offset", 2)}} value={inputValues.Offset[2].slice(0, inputValues.Offset[2].indexOf(".") > -1 ? inputValues.Offset[2].indexOf(".") : 7)} />
        </div>
        <div>
          <p className='mb1 b'>Scale</p>
          <input className='w3 bg-dark-red b--dark-red' onChange={(e) => {onInputChange(e, "Scale", 0)}} value={inputValues.Scale[0].slice(0, inputValues.Scale[0].indexOf(".") > -1 ? inputValues.Scale[0].indexOf(".") : 7)} />
          <input className='w3 bg-dark-green b--dark-green' onChange={(e) => {onInputChange(e, "Scale", 1)}} value={inputValues.Scale[1].slice(0, inputValues.Scale[1].indexOf(".") > -1 ? inputValues.Scale[1].indexOf(".") : 7)} />
          <input className='w3 bg-dark-blue b--dark-blue' onChange={(e) => {onInputChange(e, "Scale", 2)}} value={inputValues.Scale[2].slice(0, inputValues.Scale[2].indexOf(".") > -1 ? inputValues.Scale[2].indexOf(".") : 7)} />
        </div>
        <div>
          <p className='mb1 b'>Rotation</p>
          <input className='w3 bg-dark-red b--dark-red' onChange={(e) => {onInputChange(e, "Rotation", 0)}} value={inputValues.Rotation[0].slice(0, inputValues.Rotation[0].indexOf(".") > -1 ? inputValues.Rotation[0].indexOf(".") : 7)} />
          <input className='w3 bg-dark-green b--dark-green' onChange={(e) => {onInputChange(e, "Rotation", 1)}} value={inputValues.Rotation[1].slice(0, inputValues.Rotation[1].indexOf(".") > -1 ? inputValues.Rotation[1].indexOf(".") : 7)} />
          <input className='w3 bg-dark-blue b--dark-blue' onChange={(e) => {onInputChange(e, "Rotation", 2)}} value={inputValues.Rotation[2].slice(0, inputValues.Rotation[2].indexOf(".") > -1 ? inputValues.Rotation[2].indexOf(".") : 7)} />
        </div>
        <div>
          <p className='mb1 b'>Texture Id</p>
          <input className='w4 bg-grey b--grey' onChange={(e) => {onInputChange(e, "TextureId")}} value={inputValues.TextureId} />
        </div>
        <div>
          <p className='mb1 b'>Ignore Lighting</p>
          <input className='w4 h1 bg-grey b--grey' type='checkbox' onChange={(e) => {onInputChange(e, "IgnoreLighting")}} checked={inputValues.IgnoreLighting ? true : false} />
        </div>
        <div>
          <p className='mb1 b'>Point Light</p>
          <input className='w4 h1 bg-grey b--grey' type='checkbox' onChange={(e) => {onInputChange(e, "IsPointLight")}} checked={inputValues.IsPointLight ? true : false} />
        </div>
        <div className={`${inputValues.IsPointLight ? "" : "dn"} mb2`}>
          <p className='mb1 b'>Light Radius</p>
          <input className='w4 h1 bg-grey b--grey' onChange={(e) => {onInputChange(e, "Light", undefined, "Radius")}} value={inputValues.Light.Radius} />
          <p className='mb1 b'>Light Brightness</p>
          <input className='w4 h1 bg-grey b--grey' onChange={(e) => {onInputChange(e, "Light", undefined, "Brightness")}} value={inputValues.Light.Brightness} />
          <p className='mb1 b'>Light Color</p>
          <input className='w2 bg-red b--red' onChange={(e) => {onInputChange(e, "Light", 0, "Color")}} value={inputValues.Light.Color[0].slice(0, 4)} />
          <input className='w2 bg-green b--green' onChange={(e) => {onInputChange(e, "Light", 1, "Color")}} value={inputValues.Light.Color[1].slice(0, 4)} />
          <input className='w2 bg-blue b--blue' onChange={(e) => {onInputChange(e, "Light", 2, "Color")}} value={inputValues.Light.Color[2].slice(0, 4)} />
          <input className='w2 bg-grey b--grey' onChange={(e) => {onInputChange(e, "Light", 3, "Color")}} value={inputValues.Light.Color[3].slice(0, 4)} />
        </div>
      </div>
    </>
  )
}

export default Explorer
