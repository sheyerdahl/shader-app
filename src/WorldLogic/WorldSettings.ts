const cameraFarPlane = 7500
const cameraNearPlane = 1

interface IWorldSettings {
    Width: number,
    Height: number,
    FOV: number,
    Gamemode: "Edit" | "Ingame",
    NumTextures: number,
    EditMoveSpeed: number,
    IngameMoveSpeed: number,
    MoveCooldown: number,
    LightDirection: [number, number, number],
    CameraFarPlane: number,
    CameraNearPlane: number,
    ShadowCascadeLevels: [number, number, number, number],
    ShadowsEnabled: boolean,
    RotationVisuals: boolean,
    RayVisuals: boolean,
}

const WorldSettings: IWorldSettings = {
    Width: 500,
    Height: 500,
    FOV: 90,
    Gamemode: "Edit",
    NumTextures: 6,
    EditMoveSpeed: 1.5,
    IngameMoveSpeed: 1,
    MoveCooldown: 5,
    LightDirection: [1, 0, 0],
    CameraFarPlane: cameraFarPlane,
    CameraNearPlane: cameraNearPlane,
    // ShadowCascadeLevels: [cameraFarPlane / 50.0, cameraFarPlane / 25.0, cameraFarPlane / 10.0, cameraFarPlane / 2.0],
    ShadowCascadeLevels: [cameraFarPlane / 10.0, cameraFarPlane / 7.5, cameraFarPlane / 5.0, cameraFarPlane / 1.5],
    // ShadowCascadeLevels: [cameraFarPlane / 5, cameraFarPlane / 3.75, cameraFarPlane / 2.5, cameraFarPlane / 1.25],
    ShadowsEnabled: false,
    RotationVisuals: true,
    RayVisuals: true,
}

export default WorldSettings