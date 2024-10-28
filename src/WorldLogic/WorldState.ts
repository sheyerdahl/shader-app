import FourDMatrix from "../Utilities/Matrix"
import WorldSettings from "./WorldSettings"
import { CameraOffset, CameraRotation } from "./Camera"
import { GetObjectCenterPosition } from "./ObjectUtils"
import { Vector3 } from "./Vector3"
import { DrawRay } from "./Debug"

interface NewCubeData {
    Scale?: [number, number, number],
    UseCameraOffset?: boolean,
    RandomColor?: boolean,
    Offset?: [number, number, number],
    Rotation?: [number, number, number],
    Name?: string,
    Color?: [number, number, number, number],
    DontSave?: boolean,
    IgnoreRaycast?: boolean,
    IgnoreLighting?: boolean,
}

// Keys match WGSL struct code
export interface PointLight {
    position: [number, number, number],
    radius: number,
    color: [number, number, number, number],
    brightness: number,
}

export interface OffsetData {
    VertexOffset: number,
    VertexSize: number,
    IndexOffset: number,
    IndexSize: number,
    InstanceDataOffset: number,
    InstanceDataSize: number,
    VertexDataOffset: number,
    VertexDataSize: number,
    TextureId: number,
}

export interface ThreeDObject {
    Vertices: number[],
    Index: number[],
    Normals: number[],
    IndexUVs?: number[],
    UV?: number[],
    Data: {
        Color: [number, number, number, number],
        Offset: [number, number, number],
        Scale: [number, number, number],
        Rotation: [number, number, number],
        Name: string,
        Light?: {
            Radius: number,
            Color: [number, number, number, number],
            Brightness: number,
        },
        TextureId?: number,
        DontSave?: boolean,
        IgnoreRaycast?: boolean,
        DontShowInExplorer?: boolean,
        InternalName?: string,
        IgnoreLighting?: boolean,
    }
}

export interface TypedArraysOut {
    Vertices: Float32Array,
    Index: Uint32Array,
    Data: Float32Array,
    VertexData: Float32Array,
    Transformation: Float32Array,
    WorldTransformation: Float32Array,
    DirectionalLightMatrices: Float32Array[],
    OffsetData: OffsetData[],
    PointLights: PointLight[],
    NumPointLights: number,
}

const cube: ThreeDObject = {
    Vertices: [
        0.5, -0.5, 0.5,
        0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, -0.5,
        -0.5, 0.5, -0.5,
        -0.5, 0.5, 0.5,
        // 0, 0, 1,
        // 1, 0, 0,
        // 0, 0, -1,
        // -1, 0, 0,
        // 0, 1, 1,
        // 1, 1, 0,
        // 0, 1, -1,
        // -1, 1, 0
    ],
    Index: [
        0, 1, 5,  0, 5, 4, // Back Face
        0, 7, 3,  0, 4, 7, // Right Face
        0, 3, 2,  0, 2, 1, // Bottom Face
        4, 6, 7,  4, 5, 6, // Top Face
        3, 7, 6,  3, 6, 2, // Front Face
        2, 5, 1,  2, 6, 5 // Left Face
        // 0, 1, 5,  0, 5, 4, // Back Face
        // 0, 7, 3,  0, 4, 7, // Right Face
        // 0, 3, 2,  0, 2, 1, // Bottom Face
        // 4, 6, 7,  4, 5, 6, // Top Face
        // 3, 7, 6,  3, 6, 2, // Front Face
        // 2, 5, 1,  2, 6, 5 // Left Face
    ],
    // IndexUVs: [
    //     1, 0, 0, 0, 0, 0, // Back Face
    //     // 1, 0, 2, 1, 2, 3, // Back Face
    //     0, 0, 0, 0, 0, 0, // Right Face
    //     // 2, 1, 3, 2, 0, 1, // Right Face
    //     0, 0, 0, 0, 0, 0, // Bottom Face
    //     0, 0, 0, 0, 0, 0, // Top Face
    //     0, 0, 0, 0, 0, 0, // Front Face
    //     0, 0, 0, 0, 0, 0, // Left Face
    // ],
    Normals: [
        // in order from the index array:
        // 0, 0, -1,
        // 1, 0, 0,
        // 0, -1, 0,
        // 0, 1, 0,
        // 0, 0, 1,
        // -1, 0, 0,
    ],
    // UV: [
    //     0, 0,
    //     1, 0,
    //     0, 1,
    //     1, 1,
    // ],
    Data: {
        Color: [1, 1, 1, 1],
        Offset: [0, 0, -250],
        Scale: [75, 75, 75],
        Rotation: [0, 0, 0],
        Name: "Cube",
    }
}

const defaultObject: ThreeDObject = {
    Vertices: [0, 0, 0], Index: [0, 0, 0], Normals: [], 
    Data: {
        Name: "DefaultObject",
        Offset: [0, 0, 0],
        Scale: [0, 0, 0],
        Color: [0, 0, 0, 0],
        Rotation: [0, 0, 0],
        IgnoreRaycast: true,
        DontSave: true,
        DontShowInExplorer: true,
    },
}
const Objects: ThreeDObject[] = [defaultObject]

function GetWorldObjects(): ThreeDObject[] {
    return Objects
}

function AddWorldObject(threeDObject: ThreeDObject): void {
    Objects.push(threeDObject)
}

function ClearWorldObjects(): void {
    Objects.splice(1, Objects.length)
}

function DeleteObjectsByObjects(objectsToDelete: ThreeDObject[]) {
    const objects = GetWorldObjects()
    let index = 0

    objects.forEach(object => {
        if (objectsToDelete.indexOf(object) > -1) {
            objects.splice(index, 1)
        } else {
            index++
        }
    })
}

function DeleteObjectsByName(name: string) {
    const objects = GetWorldObjects()
    let index = 0

    objects.forEach(object => {
        if (object.Data.Name === name) {
            objects.splice(index, 1)
        } else {
            index++
        }
    })
}

function DeleteObjectsByInternalName(name: string) {
    const objects = GetWorldObjects()
    let index = 0

    objects.forEach(object => {
        if (object.Data.InternalName === name) {
            objects.splice(index, 1)
        } else {
            index++
        }
    })
}

function GetObjectsByName(name: string) {
    return GetWorldObjects().filter(object => {
        return object.Data.Name === name
    })
}

function GetObjectsByInternalName(name: string) {
    return GetWorldObjects().filter(object => {
        return object.Data.InternalName === name
    })
}

function GetPersistentWorldObjects() {
    return GetWorldObjects().filter(object => {
        return !object.Data.DontSave
    })
}

function GetFrustumCornersWorldSpace(projectionMatrix: FourDMatrix, viewMatrix?: FourDMatrix) {
    viewMatrix = viewMatrix || new FourDMatrix([]).IdentityMatrix()
    const inverse = projectionMatrix.Multiply(viewMatrix).Inverse()
    // const inverse = projectionMatrix.Inverse()
    const frustumCorners: Vector3[] = []

    for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
            for (let z = 0; z < 2; z++) {
                // const cornerClipSpace = new Vector3([2.0 * x - 1.0, 2.0 * y - 1.0, 2.0 * z - 1.0]).vector // In WebGPU z clip-space is 0-1? TWEAK POINT HERE
                const cornerClipSpace = new Vector3([2.0 * x - 1.0, 2.0 * y - 1.0, z]).vector
                const cornerMatrix = inverse.Multiply(new FourDMatrix([]).TranslationMatrix(cornerClipSpace[0], cornerClipSpace[1], cornerClipSpace[2])).matrix
                const worldSpaceCorner = new Vector3([cornerMatrix[12], cornerMatrix[13], cornerMatrix[14]]).DivideScalar(cornerMatrix[15])

                frustumCorners.push(worldSpaceCorner)
                // frustumCorners.push_back(pt / pt.w);
            }
        }
    }
    
    return frustumCorners;
}

function GetCameraViewMatrix(position?: [number, number, number], rotation?: [number, number, number]) {
    const cameraOffset = position || CameraOffset
    const cameraRotation = rotation || CameraRotation

    const cameraTranslation = new FourDMatrix([]).TranslationMatrix(cameraOffset[0], cameraOffset[1], cameraOffset[2])
    const cameraRotationX = new FourDMatrix([]).RotationXMatrix(cameraRotation[0])
    const cameraRotationY = new FourDMatrix([]).RotationYMatrix(cameraRotation[1])
    const cameraRotationZ = new FourDMatrix([]).RotationZMatrix(cameraRotation[2])
    const cameraMatrix = cameraTranslation.Multiply(cameraRotationY).Multiply(cameraRotationX).Multiply(cameraRotationZ) // TODO: maybe change YXZ order to XYZ for shadow mapping?
    const viewMatrix = cameraMatrix.Inverse()

    return viewMatrix
}

function GetViewProjectionMatrix() {
    const projectionMatrix = new FourDMatrix([]).PerspectiveMatrix(WorldSettings.FOV, WorldSettings.Width, WorldSettings.Height, WorldSettings.CameraNearPlane, WorldSettings.CameraFarPlane)
    const viewMatrix = GetCameraViewMatrix()
    const viewProjectionMatrix = projectionMatrix.Multiply(viewMatrix)

    return viewProjectionMatrix
}
/*

glm::mat4 Game::getDirLightVPMatrix(std::vector<glm::vec4> points)
{
	glm::vec4 frustumCenter = points[0];
	for (unsigned int i = 1; i < 8; i++)
	{
		frustumCenter += points[i];
	}
	frustumCenter /= 8;

	glm::mat4 lvMatrix = glm::lookAt(glm::vec3(frustumCenter) + glm::normalize(lightPos), glm::vec3(frustumCenter), glm::vec3(0.0f, 1.0f, 0.0f));

	glm::vec4 transf = lvMatrix * points[0];
	float minZ = transf.z;
	float maxZ = transf.z;
	float minX = transf.x;
	float maxX = transf.x;
	float minY = transf.y;
	float maxY = transf.y;

	for (unsigned int i = 1; i < 8; i++)
	{
		transf = lvMatrix * points[i];

		if (transf.z > maxZ) maxZ = transf.z;
		if (transf.z < minZ) minZ = transf.z;
		if (transf.x > maxX) maxX = transf.x;
		if (transf.x < minX) minX = transf.x;
		if (transf.y > maxY) maxY = transf.y;
		if (transf.y < minY) minY = transf.y;
	}

	glm::mat4 lpMatrix = glm::ortho(-1.0f, 1.0f, -1.0f, 1.0f, minZ, maxZ);

	const float scaleX = 2.0f / (maxX - minX);
	const float scaleY = 2.0f / (maxY - minY);
	const float offsetX = -0.5f * (minX + maxX) * scaleX;
	const float offsetY = -0.5f * (minY + maxY) * scaleY;

	glm::mat4 cropMatrix(1.0f);
	cropMatrix[0][0] = scaleX;
	cropMatrix[1][1] = scaleY;
	cropMatrix[3][0] = offsetX;
	cropMatrix[3][1] = offsetY;

	return cropMatrix * lpMatrix * lvMatrix;
}

*/

// function GetDirectionalLightMatrix2() {
//     const zMultiplier = 1 // Tweak this according to the scene
//     let center = new Vector3([0, 0, 0])
//     const corners = GetFrustumCornersWorldSpace()
//     corners.forEach(corner => {
//         center = center.AddVector(corner)
//     })
    
//     center = center.DivideScalar(corners.length)
//     DrawRay("FrustrumCenter", center, new Vector3([0, 1, 0]), 200, [1, 0, 0, 1])

//     // const viewMatrix = new FourDMatrix([]).lookAt(center.AddVector(new Vector3(WorldSettings.LightDirection).GetUnitVector()), center)
//     const viewMatrix = GetCameraViewMatrix()

//     let viewCornerMatrix = viewMatrix.Multiply(new FourDMatrix([]).TranslationMatrix(corners[0].vector[0], corners[0].vector[1], corners[0].vector[2])).matrix
//     let minX = viewCornerMatrix[12]
//     let maxX = viewCornerMatrix[12]
//     let minY = viewCornerMatrix[13]
//     let maxY = viewCornerMatrix[13]
//     let minZ = viewCornerMatrix[14]
//     let maxZ = viewCornerMatrix[14]
//     corners.forEach((corner, index) => {
//         if (index === 0) {return}
//         viewCornerMatrix = viewMatrix.Multiply(new FourDMatrix([]).TranslationMatrix(corner.vector[0], corner.vector[1], corner.vector[2])).matrix
//         // const viewCornerMatrix = viewMatrix.Multiply(new FourDMatrix([]).TranslationMatrix(corner.vector[0], corner.vector[1], corner.vector[2])).matrix;
//         // const viewCornerVector = new Vector3([viewCornerMatrix[12], viewCornerMatrix[13], viewCornerMatrix[14]]).DivideScalar(viewCornerMatrix[15]).vector
//         // const viewCornerVector = corner.vector
//         if (viewCornerMatrix[14] > maxZ) {maxZ = viewCornerMatrix[14]}
// 		if (viewCornerMatrix[14] < minZ) {minZ = viewCornerMatrix[14]}
// 		if (viewCornerMatrix[12] > maxX) {maxX = viewCornerMatrix[12]}
// 		if (viewCornerMatrix[12] < minX) {minX = viewCornerMatrix[12]}
// 		if (viewCornerMatrix[13] > maxY) {maxY = viewCornerMatrix[13]}
// 		if (viewCornerMatrix[13] < minY) {minY = viewCornerMatrix[13]}
//     })

//     const orthoMatrix = new FourDMatrix([]).OrthographicMatrix(-1, 1, -1, 1, -minZ, -maxZ) // Try inversing or switching z coordinates?

//     // glm::mat4 lpMatrix = glm::ortho(-1.0f, 1.0f, -1.0f, 1.0f, minZ, maxZ);

// 	const scaleX = 2.0 / (maxX - minX);
// 	const scaleY = 2.0 / (maxY - minY);
// 	const offsetX = -0.5 * (minX + maxX) * scaleX;
// 	const offsetY = -0.5 * (minY + maxY) * scaleY;

// 	const cropMatrix = new FourDMatrix([]).IdentityMatrix();
// 	cropMatrix.matrix[0] = scaleX;
// 	cropMatrix.matrix[5] = scaleY;
// 	cropMatrix.matrix[12] = offsetX;
// 	cropMatrix.matrix[13] = offsetY;
//     // const cropMatrix = new FourDMatrix([]).ScalingMatrix(scaleX, scaleY, 1).Multiply(new FourDMatrix([]).TranslationMatrix(offsetX, offsetY, 0));
//             /*
//         [
//             scaleX, r21, r31, 0,
//             r12, scaleY, r32, 0,
//             r13, r23, r33, 0,
//             offsetX, offsetY, 0, 0, ?? this column?
//         ] // crop matrix !!!!!!!!!!

//         [
//             r11, r12, r13, 0,
//             r21, r22, r23, 0,
//             r31, r32, r33, 0,
//             0, 0, 0, 0,
//         ] // mathematical matrix

//         [
//             r11, r21, r31, 0,
//             r12, r22, r32, 0,
//             r13, r23, r33, 0,
//             0, 0, 0, 0,
//         ] // WGSL matrix
//         */

// 	return cropMatrix.Multiply(orthoMatrix).Multiply(viewMatrix);
// }
let TEST = false
function GetDirectionalLightMatrix(nearPlane: number, farPlane: number) {
    const square = true
    const useConstantSize = true
    const zMultiplier = 5 // Tweak this according to the scene

    // nearPlane = nearPlane < 0 ? nearPlane * zMultiplier : nearPlane / zMultiplier
    // farPlane = farPlane < 0 ? farPlane * zMultiplier : farPlane / zMultiplier

    // const orthoMatrix = new FourDMatrix([]).OrthographicMatrix(-512, 512, -512, 512, 0, 1024)
    // const viewMatrix = new FourDMatrix([]).lookAt(new Vector3([-1.0, 1.0, -1.0]), new Vector3([0, 0, 0]))
    let center = new Vector3([0, 0, 0])
    const projectionMatrix = new FourDMatrix([]).PerspectiveMatrix(WorldSettings.FOV, WorldSettings.Width, WorldSettings.Height, nearPlane, farPlane)
    const corners = GetFrustumCornersWorldSpace(projectionMatrix, GetCameraViewMatrix())
    corners.forEach(corner => {
        center = center.AddVector(corner)
    })
    
    center = center.DivideScalar(corners.length)
    // DrawRay("FrustrumCenter", center, new Vector3([0, 1, 0]), 200, [1, 0, 0, 1])

    const lookAtVector = center.AddVector(new Vector3(WorldSettings.LightDirection).GetUnitVector())
    
    // const viewMatrix = new FourDMatrix([]).lookAt(lookAtVector, center) // TODO: maybe view matrix is incorrect?
    const viewMatrix = new FourDMatrix([]).lookAt(new Vector3([0, 0, 0]), new Vector3(WorldSettings.LightDirection).GetInverse().GetUnitVector())
    // viewMatrix.matrix[14] = -viewMatrix.matrix[14]

    // const viewTranslation = new FourDMatrix([]).TranslationMatrix(center.vector[0], center.vector[1], center.vector[2])
    // const viewRotationX = new FourDMatrix([]).RotationXMatrix(WorldSettings.LightDirection[0] * Math.PI)
    // const viewRotationY = new FourDMatrix([]).RotationYMatrix(WorldSettings.LightDirection[1] * Math.PI)
    // const viewRotationZ = new FourDMatrix([]).RotationZMatrix(WorldSettings.LightDirection[2] * Math.PI)
    // const viewMatrix = viewTranslation.Multiply(viewRotationX).Multiply(viewRotationY).Multiply(viewRotationZ)
    // const viewMatrix = GetCameraViewMatrix()
    
    let minX = 99999999999
    let maxX = -99999999999
    let minY = 99999999999
    let maxY = -99999999999
    let minZ = 99999999999
    let maxZ = -99999999999
    corners.forEach(corner => {
        const viewCornerMatrix = viewMatrix.Multiply(new FourDMatrix([]).TranslationMatrix(corner.vector[0], corner.vector[1], corner.vector[2])).matrix;
        const viewCornerVector = new Vector3([viewCornerMatrix[12], viewCornerMatrix[13], viewCornerMatrix[14]]).vector
        if (!TEST) {
            // console.log(viewCornerVector)
        }
        // const viewCornerVector = new Vector3([viewCornerMatrix[12], viewCornerMatrix[13], viewCornerMatrix[14]]).GetUnitVector().vector
        // const viewCornerVector = new Vector3([viewCornerMatrix[12], viewCornerMatrix[13], viewCornerMatrix[14]]).DivideScalar(viewCornerMatrix[15]).vector
        // const viewCornerVector = corner.vector
        
        minX = Math.min(minX, viewCornerVector[0]);
        maxX = Math.max(maxX, viewCornerVector[0]);
        minY = Math.min(minY, viewCornerVector[1]);
        maxY = Math.max(maxY, viewCornerVector[1]);
        minZ = Math.min(minZ, viewCornerVector[2]);
        maxZ = Math.max(maxZ, viewCornerVector[2]);
    })
    // if (!TEST) {
    //     setTimeout(() => {
    //         console.log(minX)
    //         console.log(maxX)
    //         console.log(minY)
    //         console.log(maxY)
    //         console.log(minZ)
    //         console.log(maxZ)

    //         console.log(viewMatrix.matrix)

    //         TEST = false
    //     }, 3000)
    // }
    // TEST = true
    // const temp = -minZ;
    // minZ = -maxZ;
    // maxZ = temp;

    // const mid = (maxZ - minZ) / 2;
    // minZ -= mid * 1;
    // maxZ += mid * 1;

    minZ = minZ < 0 ? minZ * zMultiplier : minZ / zMultiplier
    // maxZ = maxZ < 0 ? maxZ * zMultiplier : maxZ / zMultiplier

    let actualSize
    if (useConstantSize) {
        // keep constant world-size resolution, side length = diagonal of largest face of frustum
        // the other option looks good at high resolutions, but can result in shimmering as you look in different directions and the cascade changes size
        const farFaceDiagonal = corners[7].SubtractVector(corners[1]).GetMagnitude()
        const forwardDiagonal = corners[7].SubtractVector(corners[0]).GetMagnitude()
        actualSize = Math.max(farFaceDiagonal, forwardDiagonal)
    } else {
        actualSize = Math.max(maxX - minX, maxY - minY)
    }

    // make it square
    if (square) {
        const W = maxX - minX, H = maxY - minY;
        let diff = actualSize - H;
        if (diff > 0) {
            maxY += diff / 2.0;
            minY -= diff / 2.0;
        }
        diff = actualSize - W;
        if (diff > 0) {
            maxX += diff / 2.0;
            minX -= diff / 2.0;
        }
    }

    // console.log(minX)
    // console.log(maxX)
    // console.log(minY)
    // console.log(maxY)
    // console.log(minZ)
    // console.log(maxZ)

    // minZ *= zMultiplier
    // maxZ *= zMultiplier

    const orthoMatrix = new FourDMatrix([]).OrthographicMatrix(minX, maxX, minY, maxY, -minZ, -maxZ) // Try inversing or switching z coordinates?
    // const orthoMatrix = new FourDMatrix([]).OrthographicMatrix(minX, maxX, minY, maxY, -1 * maxZ, -1 * minZ)
    
    return orthoMatrix.Multiply(viewMatrix)
}

function GetDirectionalLightMatrices() {
    const shadowCascadeLevels = WorldSettings.ShadowCascadeLevels
    const lightSpaceMatrices = []

    for (let i = 0; i < shadowCascadeLevels.length + 1; i++) {
        if (i == 0) {
            lightSpaceMatrices.push(GetDirectionalLightMatrix(WorldSettings.CameraNearPlane, shadowCascadeLevels[i]));
        } else if (i < shadowCascadeLevels.length) {
            lightSpaceMatrices.push(GetDirectionalLightMatrix(shadowCascadeLevels[i - 1], shadowCascadeLevels[i]));
        } else {
            lightSpaceMatrices.push(GetDirectionalLightMatrix(shadowCascadeLevels[i - 1], WorldSettings.CameraFarPlane));
        }
    }

    return lightSpaceMatrices
}

function AllGeometryDataToTypedArrays(): TypedArraysOut {
    const viewProjectionMatrix = GetViewProjectionMatrix()

    const vertexArray: number[] = []
    const indexArray: number[] = []
    const dataArray: number[] = []
    const vertexDataArray: number[] = []
    const transformationArray: number[] = []
    const worldTransformationArray: number[] = []
    const offsetDataArray: OffsetData[] = []
    const pointLightsArray: PointLight[] = [{position: [0, 0, 0], radius: 0, color: [0, 0, 0, 0], brightness: 0}]
    let numPointLights = 1

    let vertexOffset = 0
    let indexOffset = 0
    let instanceDataOffset = 0
    let vertexDataOffset = 0

    const objects = GetWorldObjects()

    objects.forEach((object, index) => {
        const lightData = object.Data.Light
        let vertexCounter = 0
        let indexCounter = 0
        let instanceDataCounter = 0
        let vertexDataCounter = 0

        object.Vertices.forEach(vertex => {
            vertexCounter += 4 // Float32, 4 bytes
            vertexArray.push(vertex)
        })

        object.Index.forEach(index => {
            indexCounter += 4 // Float32, 4 bytes
            indexArray.push(index)
        })
        
        object.Data.Color.forEach(color => {
            instanceDataCounter += 4 // Float32, 4 bytes
            dataArray.push(color)
        })
        instanceDataCounter += 8
        dataArray.push(index)
        dataArray.push(object.Data.IgnoreLighting ? 1 : 0)

        if (object.UV && object.IndexUVs) {
            const uvs = object.UV as number[]
            // console.log(uvs)

            object.IndexUVs.forEach(uvIndex => {
                vertexDataCounter += 8 // 2 Float32, 8 bytes
                // console.log(uvs[(uvIndex * 2) + 0])
                // console.log(uvs[(uvIndex * 2) + 1])
                vertexDataArray.push(uvs[(uvIndex * 2) + 0])
                vertexDataArray.push(uvs[(uvIndex * 2) + 1])
            })
        } else {
            object.Index.forEach(uv => {
                vertexDataCounter += 8 // 2 Float32, 8 bytes
                vertexDataArray.push(uv)
                vertexDataArray.push(uv)
            })
        }

        // Apply camera offset and rotation
        // const objectOffset = []
        // const objectRotation = []

        // objectOffset[0] = object.Data.Offset[0] + Camera.Offset[0]
        // objectOffset[1] = object.Data.Offset[1] + Camera.Offset[1]
        // objectOffset[2] = object.Data.Offset[2] + Camera.Offset[2]
        // objectRotation[0] = object.Data.Rotation[0] + Camera.Rotation[0]
        // objectRotation[1] = object.Data.Rotation[1] + Camera.Rotation[1]
        // objectRotation[2] = object.Data.Rotation[2] + Camera.Rotation[2]

        const translationMatrix = new FourDMatrix([]).TranslationMatrix(object.Data.Offset[0], object.Data.Offset[1], object.Data.Offset[2])
        const scalingMatrix = new FourDMatrix([]).ScalingMatrix(object.Data.Scale[0], object.Data.Scale[1], object.Data.Scale[2])
        const rotationMatrixZ = new FourDMatrix([]).RotationZMatrix(object.Data.Rotation[2])
        const rotationMatrixY = new FourDMatrix([]).RotationYMatrix(object.Data.Rotation[1])
        const rotationMatrixX = new FourDMatrix([]).RotationXMatrix(object.Data.Rotation[0])

        // const rotationMatrix = rotationMatrixX.Multiply(rotationMatrixY).Multiply(rotationMatrixZ)

        // Projection -> Translate -> Rotate X -> Rotate Y -> Rotate Z -> Scale
        const transformationMatrix = viewProjectionMatrix.Multiply(translationMatrix).Multiply(rotationMatrixX).Multiply(rotationMatrixY).Multiply(rotationMatrixZ).Multiply(scalingMatrix)
        transformationMatrix.matrix.forEach(value => {
            transformationArray.push(value)
        })

        // Translate -> Rotate X -> Rotate Y -> Rotate Z -> Scale
        const worldTransformationMatrix = translationMatrix.Multiply(rotationMatrixX).Multiply(rotationMatrixY).Multiply(rotationMatrixZ).Multiply(scalingMatrix)
        worldTransformationMatrix.matrix.forEach(value => {
            worldTransformationArray.push(value)
        })

        if (lightData) {

            const centerPos = GetObjectCenterPosition(object).vector
            const newPointLight: PointLight = {
                position: [centerPos[0], centerPos[1], centerPos[2]],
                radius: lightData.Radius,
                color: [lightData.Color[0], lightData.Color[1], lightData.Color[2], lightData.Color[3]],
                brightness: lightData.Brightness,
            }

            pointLightsArray.push(newPointLight)

            numPointLights += 1
        }

        offsetDataArray.push({
            VertexOffset: vertexOffset,
            VertexSize: vertexCounter,
            IndexOffset: indexOffset,
            IndexSize: indexCounter,
            InstanceDataOffset: instanceDataOffset,
            InstanceDataSize: instanceDataCounter,
            VertexDataOffset: vertexDataOffset,
            VertexDataSize: vertexDataCounter,
            TextureId: Math.min(object.Data.TextureId || 0, WorldSettings.NumTextures),
        })

        vertexOffset += vertexCounter
        indexOffset += indexCounter
        instanceDataOffset += instanceDataCounter
        vertexDataOffset += vertexDataCounter
    })
    
    return {
        Vertices: new Float32Array(vertexArray),
        Index: new Uint32Array(indexArray),
        Data: new Float32Array(dataArray),
        VertexData: new Float32Array(vertexDataArray),
        Transformation: new Float32Array(transformationArray),
        WorldTransformation: new Float32Array(worldTransformationArray),
        DirectionalLightMatrices: GetDirectionalLightMatrices().map(matrix => new Float32Array(matrix.matrix.flat())),
        OffsetData: offsetDataArray,
        PointLights: pointLightsArray,
        NumPointLights: numPointLights,
    }
}

function NewCube(data: NewCubeData): ThreeDObject {
    const newColor = data.RandomColor ? [Math.random(), Math.random(), Math.random(), 1] : (data.Color || [1, 1, 1, 1])
    let newOffset = Array.from(cube.Data.Offset) as [number, number, number]

    if (data.UseCameraOffset) {
        newOffset = [CameraOffset[0], CameraOffset[1], CameraOffset[2]]
    } else if (data.Offset) {
        newOffset = Array.from(data.Offset) as [number, number, number]
    }

    const newCube: ThreeDObject = {
        Vertices: Array.from(cube.Vertices),
        Index: Array.from(cube.Index),
        Normals: Array.from(cube.Normals),
        UV: cube.UV ? Array.from(cube.UV) : undefined,
        IndexUVs: cube.IndexUVs ? Array.from(cube.IndexUVs) : undefined,
        Data: {
            Color: newColor as [number, number, number, number],
            Offset: newOffset,
            Scale: data.Scale ? Array.from(data.Scale) as [number, number, number] : Array.from(cube.Data.Scale) as [number, number, number],
            Rotation: data.Rotation ? Array.from(data.Rotation) as [number, number, number] : Array.from(cube.Data.Rotation) as [number, number, number],
            Name: data.Name || cube.Data.Name,
            DontSave: data.DontSave,
            IgnoreRaycast: data.IgnoreRaycast,
            IgnoreLighting: data.IgnoreLighting,
        }
    }
  
    AddWorldObject(newCube)

    return newCube
}

export {
    GetWorldObjects,
    AddWorldObject,
    cube,
    AllGeometryDataToTypedArrays,
    ClearWorldObjects,
    NewCube,
    DeleteObjectsByName,
    GetObjectsByName,
    GetViewProjectionMatrix,
    GetPersistentWorldObjects,
    GetObjectsByInternalName,
    DeleteObjectsByInternalName,
    DeleteObjectsByObjects,
    GetFrustumCornersWorldSpace,
    GetDirectionalLightMatrices,
    GetCameraViewMatrix,
}
