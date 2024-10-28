import { ThreeDObject } from "../WorldLogic/WorldState";

export function OBJToObject(file: string): ThreeDObject {
    const newObject: ThreeDObject = {
        Vertices: [],
        Index: [],
        Normals: [],
        Data: {
            Color: [1, 1, 1, 1],
            Offset: [0, 0, 0],
            Scale: [100, 100, 100],
            Rotation: [0, 0, 0],
            Name: "OBJMesh",
        },
    }

    let index = file.indexOf("mtllib")
    index = file.indexOf("v ", index)
    let command = file[index] + " "

    while (command === "v ") {
        index += 2 // to start at the number, example line from an OBJ file: v 0.000000
        const newVertex = []

        for (let i = 0; i < 3; i++) {
            const numberCharacterLength = file[index] === "-" ? 9 : 8 // Vector values have a fixed length
            // console.log("number: ", file.slice(index, index + numberCharacterLength))
            newVertex[i] = Number(file.slice(index, index + numberCharacterLength))

            index += numberCharacterLength + 1
        }

        newObject.Vertices.push(...newVertex)
        command = file[index] + file[index + 1]
    }

    index = file.indexOf("usemtl", index)
    index = file.indexOf("f ", index)
    command = file[index] + " "

    while (command === "f ") {
        index += 2 // to start at the number, example line from an OBJ file: v 0.000000
        const newIndex1 = []
        const newIndex2 = [] // For triangulating quads

        for (let i = 0; i < 4; i++) {
            if (Number.isNaN(Number(file[index]))) {break} // If it's a regular triangle file[index] = "f" character, breaking the loop

            let faceVectorDataLength = 1
            let indexCharacterLength = 1
            let passedIndex = false

            for (let j = 1; j < 99; j++) {
                if (file[index + j] === "f") {
                    faceVectorDataLength--
                    // i = 3
                    break
                }
                if (file[index + j] === " ") {break}
                if (!Number.isNaN(Number(file[index + j])) && !passedIndex) {
                    indexCharacterLength++
                } else {
                    passedIndex = true
                }

                faceVectorDataLength++
            }
            
            // console.log(file.slice(index, index + indexCharacterLength))
            if (i === 3) {
                newIndex2[0] = newIndex1[0]
                newIndex2[1] = newIndex1[2]
                newIndex2[2] = Number(file.slice(index, index + indexCharacterLength)) - 1
            } else {
                newIndex1[i] = Number(file.slice(index, index + indexCharacterLength)) - 1
            }

            index += faceVectorDataLength + 1
        }

        newObject.Index.push(...newIndex1)
        newObject.Index.push(...newIndex2)
        command = file[index] + file[index + 1]
    }

    // console.log(newObject)
    // console.log(file[index - 1])
    // console.log(file[index])
    // console.log(file[index + 1])
    // console.log(index)
    
    return newObject
}