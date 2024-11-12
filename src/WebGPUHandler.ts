import renderGeometryCode from "./Shaders/RenderGeometry.ts"
import blurFilterCode from "./Shaders/BlurFilter.ts"
import shadowMapCode from "./Shaders/ShadowMap.ts"
import postProcessCode from "./Shaders/PostProcess.ts"
import { AllGeometryDataToTypedArrays, TypedArraysOut, OffsetData, PointLight, GetDirectionalLightMatrices, GetCameraViewMatrix } from "./WorldLogic/WorldState.ts"
import FourDMatrix from "./Utilities/Matrix.ts"
import { makeShaderDataDefinitions, makeStructuredView, getSizeAndAlignmentOfUnsizedArrayElement} from 'webgpu-utils'
import { loadImageBitmap } from "./Utilities/Network.ts"
import WorldSettings from "./WorldLogic/WorldSettings.ts"
import cat_square from "./assets/cat_square.png"
import dog_swimming from "./assets/dog_swimming.webm"
import Sun1 from "./assets/Sun1.webp"
import WhiteWoodPlank from "./assets/WhiteWoodPlank.jpg"
import WoodPlank2 from "./assets/WoodPlank2.jpg"

const testTextureWidth = 4
const testTextureHeight = 4
const defs = makeShaderDataDefinitions(renderGeometryCode)

const textureList: {name: string, videoURL?: string, video?: HTMLVideoElement, bitmap?: ImageBitmap}[] = [
    {  
        name: "None",
        bitmap: await loadImageBitmap(cat_square),
    },
    {
        name: "kitty",
        bitmap: await loadImageBitmap(cat_square),
    },
    {
        name: "DogVideo",
        videoURL: dog_swimming,
        video: document.createElement("video"),
    },
    {
        name: "GranitePaving",
        bitmap: await loadImageBitmap("https://webgpufundamentals.org/webgpu/resources/images/Granite_paving_tileable_512x512.jpeg"),
    },
    {
        name: "WhiteWoodPlank",
        bitmap: await loadImageBitmap(WhiteWoodPlank),
    },
    {
        name: "WoodPlank2",
        bitmap: await loadImageBitmap(WoodPlank2),
    },
    {
        name: "Sun",
        bitmap: await loadImageBitmap(Sun1),
    },
]

textureList.forEach(textureItem => {
    const video = textureItem.video
    const videoURL = textureItem.videoURL

    if (video && videoURL) {
        video.muted = true
        video.loop = true
        video.preload = 'auto'
        video.autoplay = true
        video.src = textureItem.videoURL as string

        video.play()
    }
})


interface IBuffers {
    GeometryVertex: GPUBuffer,
    GeometryInstanceData: GPUBuffer,
    GeometryIndex: GPUBuffer,
    GeometryVertexData: GPUBuffer,
    // GeometryProjectionMatrix: GPUBuffer,
    GeometryTransformationMatrix: GPUBuffer,
    GeometryWorldTransformationMatrix: GPUBuffer,
    GeometryLightDirection: GPUBuffer,
    GeometryPointLights: GPUBuffer,
    GeometryNumPointLights: GPUBuffer,

    BlurFilterHorizontal: GPUBuffer,
}

interface ITextures {
    RenderGeometryAttachment: GPUTexture,
    RenderGeometryBindable: GPUTexture,
    BlurFilterAttachment: GPUTexture,
    BlurFilterBrightColorsBindable: GPUTexture,
    BlurFilterBloomBindable: GPUTexture,
    PostProcessAttachment: GPUTexture,
    PostProcessBindable: GPUTexture,
    ShadowMapAttachment: GPUTexture,
    ShadowMapBindable: GPUTexture,
}

interface IBindGroups {
    RenderGeometryBindGroup: GPUBindGroup,
    BlurFilterBindGroupHorizontal: GPUBindGroup,
    BlurFilterBindGroupVertical: GPUBindGroup,
    TexturesBindGroups: GPUBindGroup[],
    PostProcessBindGroup: GPUBindGroup,
    ShadowMapBindGroup: GPUBindGroup,
    DirectionalLightMatrixBindGroups: GPUBindGroup[],
}

export default class WebGPUHandler {
    device: GPUDevice
    contexts: GPUCanvasContext[]
    pingPongIndex: number
    gridSize: number
    pipelines: {
        RenderGeometryPipeline: GPURenderPipeline,
        BlurFilterPipeline: GPURenderPipeline,
        PostProcessPipeline: GPURenderPipeline,
        ShadowMapPipeline: GPURenderPipeline
    }
    bindGroupLayouts: {
        RenderGeometryBindGroupLayout: GPUBindGroupLayout,
        TexturesBindGroupLayout: GPUBindGroupLayout,
        BlurFilterBindGroupLayout: GPUBindGroupLayout,
        PostProcessBindGroupLayout: GPUBindGroupLayout,
        ShadowMapBindGroupLayout: GPUBindGroupLayout,
        DirectionalLightMatrixBindGroupLayout: GPUBindGroupLayout,
    }
    textureBitmap?: ImageBitmap

    constructor(device: GPUDevice, contexts: GPUCanvasContext[], gridSize: number, textureBitmap?: ImageBitmap) {
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
        contexts.forEach(context => {
            context.configure({
                device: device,
                format: canvasFormat,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
            })
        })

        const renderGeometryModule = device.createShaderModule({
            label: "Render Geometry Shader module",
            code: renderGeometryCode
        })

        const renderGeometryBindGroupLayout = device.createBindGroupLayout({
            label: "Render Geometry Bind Group layout",
            entries: [
                // {
                //     binding: 0,
                //     visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                //     buffer: {type: "uniform"}
                // },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {type: "read-only-storage"}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {type: "uniform"}
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {type: "read-only-storage"}
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {type: "read-only-storage"}
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {type: "uniform"}
                },
                {
                    binding: 9,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {type: "read-only-storage"}
                },
                {
                    binding: 10,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {sampleType: "depth", viewDimension: "2d-array"}
                },
                {
                    binding: 11,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {},
                },
                {
                    binding: 12,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {type: "read-only-storage"},
                },
                {
                    binding: 13,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {type: "uniform"},
                },
                {
                    binding: 14,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {type: "uniform"},
                },
                {
                    binding: 15,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {type: "uniform"},
                },
            ]
        })

        const texturesBindGroupLayout = device.createBindGroupLayout({
            label: "Textures Bind Group layout",
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: {} },
                { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} }
            ]
        })

        const directionalLightMatrixBindGroupLayout = device.createBindGroupLayout({
            label: "DirectionalLightMatrix Bind Group layout",
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
            ]
        })

        const renderGeometryPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [renderGeometryBindGroupLayout, texturesBindGroupLayout]
        })
    
        const renderGeometryPipeline = device.createRenderPipeline({
            label: "Render Geometry pipeline",
            layout: renderGeometryPipelineLayout,
            vertex: {
                module: renderGeometryModule,
                entryPoint: "vertexMain",
                buffers: [
                    {
                        arrayStride: 4 * 3, // 3 float 32's
                        attributes: [
                            {shaderLocation: 0, offset: 0, format: "float32x3"}, // Position
                            // {shaderLocation: 1, offset: 0, format: "float32x3"}, // Normal
                        ]
                    },
                    {
                        arrayStride: 4 * 2, // 2 float 32's
                        attributes: [
                            {shaderLocation: 1, offset: 0, format: "float32x2"}, // UV
                        ]
                    },
                    {
                        arrayStride: 4 * 6, // 6 float 32's
                        stepMode: "instance",
                        attributes: [
                            {shaderLocation: 2, offset: 0, format: "float32x4"}, // Color
                            {shaderLocation: 3, offset: 16, format: "float32"}, // Transformation Index
                            {shaderLocation: 4, offset: 20, format: "float32"}, // Ignore Lighting
                        ]
                    },
                ]
            },
            fragment: {
                module: renderGeometryModule,
                entryPoint: "fragmentMain",
                targets: [
                    {
                        format: canvasFormat,
                        blend: {
                            color: {
                                operation: "add",
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha'
                            },
                            alpha: {
                                operation: "add",
                                srcFactor: 'src-alpha',
                                dstFactor: 'src-alpha'
                            },
                        },
                    },
                    {
                        format: "bgra8unorm"
                    }
                ]
            },
            primitive: {
                cullMode: "back"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            }
        })

        this.device = device
        this.contexts = contexts
        this.pingPongIndex = 0
        this.gridSize = gridSize


        const [postProcessPipeline, postProcessBindGroupLayout] = this.CreateBasicPipeline(postProcessCode, "PostProcess", [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: "depth", viewDimension: "2d-array"} },
        ])

        const [blurFilterPipeline, blurFilterBindGroupLayout] = this.CreateBasicPipeline(blurFilterCode, "BlurFilter", [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: {} },
        ])

        const shadowMapModule = device.createShaderModule({
            label: "ShadowMap Module",
            code: shadowMapCode,
        })

        const shadowMapBindGroupLayout = device.createBindGroupLayout({
            label: "ShadowMap Bind Group Layout",
            entries: [
                // { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: "uniform"} },
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: "read-only-storage"} },
            ]
        })

        const shadowMapPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [shadowMapBindGroupLayout, directionalLightMatrixBindGroupLayout]
        })

        const shadowMapPipeline = device.createRenderPipeline({
            label: "ShadowMap pipeline",
            layout: shadowMapPipelineLayout,
            vertex: {
                module: shadowMapModule,
                entryPoint: "vertexMain",
                buffers: [
                    {
                        arrayStride: 4 * 3, // 3 float 32's
                        attributes: [
                            {shaderLocation: 0, offset: 0, format: "float32x3"}, // Position
                        ]
                    },
                    {
                        arrayStride: 4 * 6, // 6 float 32's
                        stepMode: "instance",
                        attributes: [
                            {shaderLocation: 1, offset: 16, format: "float32"}, // Transformation Index
                        ]
                    },
                ]
            },
            fragment: undefined,
            primitive: {
                cullMode: "front" // if there's an issue, can try commenting this out
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            }
        })


        this.pipelines = {
            RenderGeometryPipeline: renderGeometryPipeline,
            BlurFilterPipeline: blurFilterPipeline,
            PostProcessPipeline: postProcessPipeline,
            ShadowMapPipeline: shadowMapPipeline,
        }
        this.bindGroupLayouts = {
            RenderGeometryBindGroupLayout: renderGeometryBindGroupLayout,
            TexturesBindGroupLayout: texturesBindGroupLayout,
            BlurFilterBindGroupLayout: blurFilterBindGroupLayout,
            PostProcessBindGroupLayout: postProcessBindGroupLayout,
            ShadowMapBindGroupLayout: shadowMapBindGroupLayout,
            DirectionalLightMatrixBindGroupLayout: directionalLightMatrixBindGroupLayout,
        }
        this.textureBitmap = textureBitmap
    }

    Render() {
        const BuffersAndBindGroups = this.CreateBuffersAndBindGroups()
        const encoder = this.device.createCommandEncoder()
        const buffers = BuffersAndBindGroups.buffers
        const bindGroups = BuffersAndBindGroups.bindGroups
        const textures = BuffersAndBindGroups.textures
        const contextTexture0 = this.contexts[0].getCurrentTexture()
        const renderGeometryDepthTexture = this.device.createTexture({
            size: [contextTexture0.width, contextTexture0.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })

        // ShadowMap pass
        if (WorldSettings.ShadowsEnabled) {
            for (let i = 0; i < WorldSettings.ShadowCascadeLevels.length + 1; i++) {
                const pass = encoder.beginRenderPass({
                    colorAttachments: [],
                    depthStencilAttachment: {
                        view: textures.ShadowMapAttachment.createView({baseArrayLayer: i, arrayLayerCount: 1}),
                        depthClearValue: 1,
                        depthLoadOp: "clear",
                        depthStoreOp: "store"
                    }
                })
    
                pass.setPipeline(this.pipelines.ShadowMapPipeline)
                pass.setBindGroup(0, bindGroups.ShadowMapBindGroup)
                pass.setBindGroup(1, bindGroups.DirectionalLightMatrixBindGroups[i])
    
                BuffersAndBindGroups.OffsetData.forEach(offsetData => {
                    if (offsetData.DontCastShadow) {return}
                    // const instanceAmount = this.geometryData.Data.length / 4
                    pass.setVertexBuffer(0, buffers.GeometryVertex, offsetData.VertexOffset, offsetData.VertexSize)
                    // pass.setVertexBuffer(1, buffers.GeometryVertexData, offsetData.VertexDataOffset, offsetData.VertexDataSize)
                    pass.setVertexBuffer(1, buffers.GeometryInstanceData, offsetData.InstanceDataOffset, offsetData.InstanceDataSize)
                    pass.setIndexBuffer(buffers.GeometryIndex, "uint32", offsetData.IndexOffset, offsetData.IndexSize)
                    
                    pass.drawIndexed(offsetData.IndexSize / 4)
                })
    
                pass.end()
            }
        }

        encoder.copyTextureToTexture({ texture: textures.ShadowMapAttachment}, { texture: textures.ShadowMapBindable }, {width: 1024, height: 1024, depthOrArrayLayers: WorldSettings.ShadowCascadeLevels.length + 1})
        
        // RenderGeometry pass
        {
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: textures.RenderGeometryAttachment.createView(),
                        loadOp: "clear",
                        clearValue: {r: 0.08, g: 0.08, b: 0.08, a: 1},
                        storeOp: "store"
                    },
                    {
                        view: textures.BlurFilterAttachment.createView(),
                        loadOp: "clear",
                        clearValue: {r: 0, g: 0, b: 0, a: 1},
                        storeOp: "store"
                    },
            ],
                depthStencilAttachment: {
                    view: renderGeometryDepthTexture.createView(),
                    depthClearValue: 1,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                }
            })
        
            pass.setPipeline(this.pipelines.RenderGeometryPipeline)
            pass.setBindGroup(0, bindGroups.RenderGeometryBindGroup)

            BuffersAndBindGroups.OffsetData.forEach(offsetData => {
                // const indexCount = buffers.GeometryIndex.size / 4 // GPUBuffer.size is in bytes, f32 is 4 bytes
                // const instanceAmount = this.geometryData.Data.length / 4
                pass.setVertexBuffer(0, buffers.GeometryVertex, offsetData.VertexOffset, offsetData.VertexSize)
                pass.setVertexBuffer(1, buffers.GeometryVertexData, offsetData.VertexDataOffset, offsetData.VertexDataSize)
                pass.setVertexBuffer(2, buffers.GeometryInstanceData, offsetData.InstanceDataOffset, offsetData.InstanceDataSize)
                pass.setIndexBuffer(buffers.GeometryIndex, "uint32", offsetData.IndexOffset, offsetData.IndexSize)
                
                pass.setBindGroup(1, bindGroups.TexturesBindGroups[offsetData.TextureId])
                pass.drawIndexed(offsetData.IndexSize / 4)
            })

            pass.end()
        }
        
        encoder.copyTextureToTexture({ texture: textures.RenderGeometryAttachment}, { texture: textures.RenderGeometryBindable }, {width: WorldSettings.Width, height: WorldSettings.Height})
        encoder.copyTextureToTexture({ texture: textures.BlurFilterAttachment}, { texture: textures.BlurFilterBrightColorsBindable }, {width: WorldSettings.Width, height: WorldSettings.Height})
        
        // BlurFilter pass
        const BlurFilterPass = (bindGroup: GPUBindGroup) => {
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: textures.BlurFilterAttachment.createView(),
                        loadOp: "load",
                        clearValue: {r: 0, g: 0, b: 0, a: 1},
                        storeOp: "store"
                    },
                ],
            })

            pass.setPipeline(this.pipelines.BlurFilterPipeline)
            pass.setBindGroup(0, bindGroup)
            pass.draw(6)

            pass.end()
        }
        
        BlurFilterPass(bindGroups.BlurFilterBindGroupVertical)
        
        const blurIterations = 10
        for (let i = 0; i < blurIterations; i++) {
            encoder.copyTextureToTexture({ texture: textures.BlurFilterAttachment}, { texture: textures.BlurFilterBrightColorsBindable }, {width: WorldSettings.Width, height: WorldSettings.Height})
    
            BlurFilterPass(i % 2 === 0 ? bindGroups.BlurFilterBindGroupVertical : bindGroups.BlurFilterBindGroupHorizontal)
        }

        encoder.copyTextureToTexture({ texture: textures.BlurFilterAttachment}, { texture: textures.BlurFilterBloomBindable }, {width: WorldSettings.Width, height: WorldSettings.Height})


        // PostProcess pass
        {
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: textures.PostProcessAttachment.createView(),
                        loadOp: "clear",
                        clearValue: {r: 0, g: 1, b: 0, a: 1},
                        storeOp: "store"
                    },
                ],
            })

            pass.setPipeline(this.pipelines.PostProcessPipeline)
            pass.setBindGroup(0, bindGroups.PostProcessBindGroup)
            pass.draw(6)

            pass.end()
        }

        encoder.copyTextureToTexture({ texture: textures.PostProcessAttachment}, { texture: textures.PostProcessBindable }, {width: WorldSettings.Width, height: WorldSettings.Height})

        encoder.copyTextureToTexture({ texture: textures.PostProcessAttachment}, { texture: contextTexture0 }, {width: WorldSettings.Width, height: WorldSettings.Height})
        //encoder.copyTextureToTexture({ texture: textures.RenderGeometryAttachment}, { texture: contextTexture0 }, {width: WorldSettings.Width, height: WorldSettings.Height})
        // encoder.copyTextureToTexture({ texture: textures.RenderGeometryAttachment}, { texture: this.contexts[1].getCurrentTexture() }, {width: WorldSettings.Width, height: WorldSettings.Height})

        this.device.queue.submit([encoder.finish()])

        this.pingPongIndex++

        this.DestroyGPUObjects(Object.values(buffers))
        this.DestroyGPUObjects(Object.values(textures))
    }

    ReloadGeometryBuffers() {
        // const newGeometryData = AllGeometryDataToTypedArrays()
        // const projectionMatrix = new Float32Array(new FourDMatrix([]).OrthographicMatrix(0, this.context.canvas.width, this.context.canvas.height, 0, zNear, zFar).matrix)
        // this.geometryData = newGeometryData


        // const cameraRotationX = new FourDMatrix([]).RotationXMatrix(Camera.Rotation[0])
        // const cameraRotationY = new FourDMatrix([]).RotationYMatrix(Camera.Rotation[1])
        // const cameraRotationZ = new FourDMatrix([]).RotationZMatrix(Camera.Rotation[2])
        // const cameraRotationMatrix = cameraRotationX.Multiply(cameraRotationY).Multiply(cameraRotationZ).matrix
        // const x = cameraRotationMatrix[9]
        // const y = cameraRotationMatrix[10]
        // const z = cameraRotationMatrix[11]
        // const magnitude = Math.sqrt(x ^ 2 + y ^ 2 + z ^ 2)
        // const newLightDirection = [x / magnitude, y / magnitude, z / magnitude]
        // console.log(newLightDirection)


        // const device = this.device


        // console.log(this.buffers.GeometryVertex.size, this.geometryData.Vertices.byteLength)


        // device.queue.writeBuffer(this.buffers.GeometryVertex, 0, this.geometryData.Vertices)
        // device.queue.writeBuffer(this.buffers.GeometryInstanceData, 0, this.geometryData.Data)
        // device.queue.writeBuffer(this.buffers.GeometryIndex, 0, this.geometryData.Index)
        // device.queue.writeBuffer(this.buffers.GeometryProjectionMatrix, 0, projectionMatrix)
        // device.queue.writeBuffer(this.buffers.GeometryTransformationMatrixs, 0, this.geometryData.Transformation)


        // device.queue.writeBuffer(this.buffers.GeometryLightDirectionBuffer, 0, new Float32Array(newLightDirection))
        
        // device.queue.writeBuffer(this.buffers.GeometryVertex, 0, this.geometryData.Vertices, 0, this.geometryData.Vertices.byteLength)
        // device.queue.writeBuffer(this.buffers.GeometryInstanceData, 0, this.geometryData.Data, 0, this.geometryData.Data.byteLength)
        // device.queue.writeBuffer(this.buffers.GeometryIndex, 0, this.geometryData.Index, 0, this.geometryData.Index.byteLength)
        // device.queue.writeBuffer(this.buffers.GeometryProjectionMatrix, 0, projectionMatrix, 0, projectionMatrix.byteLength)
        // device.queue.writeBuffer(this.buffers.GeometryTransformationMatrixs, 0, this.geometryData.Transformation, 0, this.geometryData.Transformation.byteLength)
    }

    private CreateBuffersAndBindGroups(): {buffers: IBuffers, textures: ITextures, bindGroups: IBindGroups, OffsetData: OffsetData[]} {
        const device = this.device
        const geometryData = AllGeometryDataToTypedArrays()
        const pointLightSizeData = getSizeAndAlignmentOfUnsizedArrayElement(defs.storages.pointLights)
        const pointLightsValues = makeStructuredView(defs.storages.pointLights, new ArrayBuffer(pointLightSizeData.size * geometryData.NumPointLights))
        pointLightsValues.set(geometryData.PointLights)
        const cameraViewMatrix = GetCameraViewMatrix()

        const shadowCascadeLevelsTyped = new Float32Array(WorldSettings.ShadowCascadeLevels)
        const cameraFarPlaneTyped = new Float32Array(WorldSettings.CameraFarPlane)
        const shadowsEnabledTyped = new Uint32Array([WorldSettings.ShadowsEnabled ? 1 : 0])
   
        const geometryInstanceDataBuffer = device.createBuffer({
            label: "Geometry instance data buffer",
            size: geometryData.Data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })

        const geometryVertexDataBuffer = device.createBuffer({
            label: "Geometry Vertex data buffer",
            size: geometryData.VertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })
        
        const geometryVertexBuffer = device.createBuffer({
            label: "Geometry vertices",
            size: geometryData.Vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })
    
        const geometryIndexBuffer = device.createBuffer({
            label: "Geometry Index buffer",
            size: geometryData.Index.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        })
    
        const transformationMatrixBuffer = device.createBuffer({
            label: "Transformation matrix buffer",
            size: geometryData.Transformation.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        })

        const worldTransformationMatrixBuffer = device.createBuffer({
            label: "World Transformation matrix buffer",
            size: geometryData.Transformation.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        })

        const pointLightsBuffer = device.createBuffer({
            label: "Point Lights buffer",
            // size: geometryData.PointLights.byteLength,
            size: pointLightsValues.arrayBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        })

        const numPointLightsBuffer = device.createBuffer({
            label: "Num point lights buffer",
            size: new Uint32Array(geometryData.NumPointLights).byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    
        const lightDirectionBuffer = device.createBuffer({
            label: "Light Direction Buffer",
            size: 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        const testTexture = device.createTexture({
            label: "Test Texture",
            size: [testTextureWidth, testTextureHeight],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            format: "rgba8unorm"
        })

        const directionalLightMatricesSize = geometryData.DirectionalLightMatrices.map(array => array.byteLength).reduce((acc, value) => acc + value)
        const directionalLightMatricesBuffer = device.createBuffer({
            label: "Directional Light Matrix Buffer",
            size: directionalLightMatricesSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })

        const cascadePlaneDistancesBuffer = device.createBuffer({
            label: "Cascade Plane distances buffer",
            size: shadowCascadeLevelsTyped.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })

        const cameraViewMatrixBuffer = device.createBuffer({
            label: "Camera View Matrix buffer",
            size: cameraViewMatrix.matrix.length * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        const cameraFarPlaneBuffer = device.createBuffer({
            label: "Camera Far Plane buffer",
            size: cameraFarPlaneTyped.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        
        const shadowsEnabledBuffer = device.createBuffer({
            label: "Shadows Enabled buffer",
            size: shadowsEnabledTyped.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        // console.time("Test")
        const r = [255, 0, 0, 255]
        const g = [0, 255, 0, 255]
        const b = [0, 0, 255, 255]
        device.queue.writeTexture(
            {texture: testTexture},
            new Uint8Array([r, r, r, r, b, b, b, b, g, g, g, g, b, b, b, b,].flat()),
            { bytesPerRow: testTextureWidth * 4 },
            { width: testTextureWidth, height: testTextureHeight }
        )
        
        // const testTexture = device.createTexture({
        //     label: "Test Texture",
        //     size: [this.textureBitmap.width, this.textureBitmap.height],
        //     usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        //     format: "rgba8unorm"
        // })

        // device.queue.copyExternalImageToTexture(
        //     {source: this.textureBitmap, flipY: true},
        //     {texture: testTexture},
        //     { width: this.textureBitmap.width, height: this.textureBitmap.height },
        // )

        const sampler = device.createSampler({
            label: "Sampler",
            magFilter: "nearest",
            addressModeU: "mirror-repeat",
            addressModeV: "mirror-repeat",
        })
        const shadowMapSampler = device.createSampler({
            label: "ShadowMap Sampler",
            magFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
        })
        // console.timeEnd("Test")

        const renderGeometryAttachment = this.CreateAttachmentTexture()
        const renderGeometryBindable = this.CreateBindableTexture()
        
        device.queue.writeBuffer(geometryVertexBuffer, 0, geometryData.Vertices)
        device.queue.writeBuffer(geometryInstanceDataBuffer, 0, geometryData.Data)
        device.queue.writeBuffer(geometryIndexBuffer, 0, geometryData.Index)
        device.queue.writeBuffer(geometryVertexDataBuffer, 0, geometryData.VertexData)
        // device.queue.writeBuffer(projectionMatrixBuffer, 0, projectionMatrix)
        device.queue.writeBuffer(transformationMatrixBuffer, 0, geometryData.Transformation)
        device.queue.writeBuffer(worldTransformationMatrixBuffer, 0, geometryData.WorldTransformation)
        device.queue.writeBuffer(lightDirectionBuffer, 0, new Float32Array(WorldSettings.LightDirection))
        device.queue.writeBuffer(pointLightsBuffer, 0, pointLightsValues.arrayBuffer)
        device.queue.writeBuffer(numPointLightsBuffer, 0, new Uint32Array([geometryData.NumPointLights]))
        device.queue.writeBuffer(cascadePlaneDistancesBuffer, 0, shadowCascadeLevelsTyped)
        device.queue.writeBuffer(directionalLightMatricesBuffer, 0, new Float32Array(GetDirectionalLightMatrices().map(matrix => matrix.matrix as number[]).reduce((acc, value) => [...acc, ...value])))
        device.queue.writeBuffer(cameraViewMatrixBuffer, 0, new Float32Array(cameraViewMatrix.matrix))
        device.queue.writeBuffer(cameraFarPlaneBuffer, 0, cameraFarPlaneTyped)
        device.queue.writeBuffer(shadowsEnabledBuffer, 0, shadowsEnabledTyped)

        // ShadowMap
        const directionalLightMatrixBindGroups: GPUBindGroup[] = []
        for (let i = 0; i < WorldSettings.ShadowCascadeLevels.length + 1; i++) {
            const directionalLightMatrixBuffer = device.createBuffer({
                label: "Directional Light Matrix Buffer",
                size: geometryData.DirectionalLightMatrices[i].byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            })

            device.queue.writeBuffer(directionalLightMatrixBuffer, 0, geometryData.DirectionalLightMatrices[i])

            const directionalLightMatrixBindGroup = device.createBindGroup({
                label: "directionalLightMatrixBindGroup Bind Group",
                layout: this.bindGroupLayouts.DirectionalLightMatrixBindGroupLayout,
                entries: [
                    {binding: 0, resource: {buffer: directionalLightMatrixBuffer}},
                ],
            })

            directionalLightMatrixBindGroups.push(directionalLightMatrixBindGroup)
        }

        const shadowMapAttachment = this.CreateAttachmentTexture("depth24plus", [1024, 1024, WorldSettings.ShadowCascadeLevels.length + 1])
        const shadowMapBindable = this.CreateBindableTexture("depth24plus", [1024, 1024, WorldSettings.ShadowCascadeLevels.length + 1])

        const shadowMapBindGroup = device.createBindGroup({
            label: "ShadowMap Bind Group",
            layout: this.bindGroupLayouts.ShadowMapBindGroupLayout,
            entries: [
                // {binding: 0, resource: {buffer: directionalLightMatrixBuffer}},
                {binding: 0, resource: {buffer: worldTransformationMatrixBuffer}},
            ],
        })

        const renderGeometryBindGroup = device.createBindGroup({
            label: "Render Geometry bind group",
            layout: this.bindGroupLayouts.RenderGeometryBindGroupLayout,
            entries: [
                // {binding: 0, resource: {buffer: projectionMatrixBuffer}},
                {binding: 1, resource: {buffer: transformationMatrixBuffer}},
                {binding: 2, resource: testTexture.createView()},
                {binding: 3, resource: sampler},
                {binding: 4, resource: {buffer: lightDirectionBuffer}},
                {binding: 5, resource: {buffer: worldTransformationMatrixBuffer}},
                {binding: 6, resource: {buffer: pointLightsBuffer}},
                {binding: 7, resource: {buffer: numPointLightsBuffer}},
                {binding: 9, resource: {buffer: directionalLightMatricesBuffer}},
                {binding: 10, resource: shadowMapBindable.createView({arrayLayerCount: WorldSettings.ShadowCascadeLevels.length + 1})},
                {binding: 11, resource: shadowMapSampler},
                {binding: 12, resource: {buffer: cascadePlaneDistancesBuffer}},
                {binding: 13, resource: {buffer: cameraViewMatrixBuffer}},
                {binding: 14, resource: {buffer: cameraFarPlaneBuffer}},
                {binding: 15, resource: {buffer: shadowsEnabledBuffer}},
            ]
        })

        // Blur Filter
        const blurFilterAttachment = this.CreateAttachmentTexture()
        const brightColorsBindable = this.CreateBindableTexture()
        const bloomBindable = this.CreateBindableTexture()

        const blurFilterHorizontal = device.createBuffer({
            label: "BlurFilter Horizontal buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        
        const blurFilterVertical = device.createBuffer({
            label: "BlurFilter Horizontal buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        device.queue.writeBuffer(blurFilterHorizontal, 0, new Uint32Array([1]))
        device.queue.writeBuffer(blurFilterVertical, 0, new Uint32Array([0]))

        const blurFilterBindGroupHorizontal = device.createBindGroup({
            label: "Blur Filter Bind Group",
            layout: this.bindGroupLayouts.BlurFilterBindGroupLayout,
            entries: [
                {binding: 0, resource: sampler},
                {binding: 1, resource: brightColorsBindable.createView()},
                {binding: 2, resource: {buffer: blurFilterHorizontal}},
            ],
        })

        const blurFilterBindGroupVertical = device.createBindGroup({
            label: "Blur Filter Bind Group 2",
            layout: this.bindGroupLayouts.BlurFilterBindGroupLayout,
            entries: [
                {binding: 0, resource: sampler},
                {binding: 1, resource: brightColorsBindable.createView()},
                {binding: 2, resource: {buffer: blurFilterVertical}},
            ],
        })


        // PostProcess

        const postProcessAttachment = this.CreateAttachmentTexture()
        const postProcessBindable = this.CreateBindableTexture()

        const postProcessBindGroup = device.createBindGroup({
            label: "PostProcess Bind Group",
            layout: this.bindGroupLayouts.PostProcessBindGroupLayout,
            entries: [
                {binding: 0, resource: sampler},
                {binding: 1, resource: renderGeometryBindable.createView()},
                {binding: 2, resource: bloomBindable.createView()},
                {binding: 3, resource: shadowMapBindable.createView({arrayLayerCount: WorldSettings.ShadowCascadeLevels.length + 1})},
            ],
        })


        const texturesBindGroups = textureList.map((textureItem, index) => {
            const source = (textureItem.video ? textureItem.video : textureItem.bitmap) as HTMLVideoElement | ImageBitmap
            const width = textureItem.video ? textureItem.video.videoWidth : source.width
            const height = textureItem.video ? textureItem.video.videoHeight : source.height

            const newTexture = device.createTexture({
                label: `Texture ${index}`,
                size: [width, height],
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                format: "rgba8unorm"
            })

            device.queue.copyExternalImageToTexture(
                {source, flipY: true},
                {texture: newTexture},
                { width, height },
            )

            const hasTextureBuffer = device.createBuffer({
                label: "Has Texture Buffer",
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            })

            device.queue.writeBuffer(hasTextureBuffer, 0, new Uint32Array([index > 0 ? 1 : 0]))

            return device.createBindGroup({
                label: "Textures bind group",
                layout: this.bindGroupLayouts.TexturesBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: newTexture.createView(),
                    },
                    {
                        binding: 1,
                        resource: {buffer: hasTextureBuffer},
                    },
                ]
            })

            // return {
            //     binding: index,
            //     resource: newTexture.createView()
            // }
        })

        const buffers: IBuffers = {
            GeometryInstanceData: geometryInstanceDataBuffer,
            GeometryVertex: geometryVertexBuffer,
            GeometryIndex: geometryIndexBuffer,
            GeometryVertexData: geometryVertexDataBuffer,
            GeometryTransformationMatrix: transformationMatrixBuffer,
            GeometryLightDirection: lightDirectionBuffer,
            GeometryWorldTransformationMatrix: worldTransformationMatrixBuffer,
            GeometryPointLights: pointLightsBuffer,
            GeometryNumPointLights: numPointLightsBuffer,

            BlurFilterHorizontal: blurFilterHorizontal,
        }

        const textures: ITextures = {
            RenderGeometryAttachment: renderGeometryAttachment,
            RenderGeometryBindable: renderGeometryBindable,
            BlurFilterBrightColorsBindable: brightColorsBindable,
            BlurFilterAttachment: blurFilterAttachment,
            BlurFilterBloomBindable: bloomBindable,
            PostProcessAttachment: postProcessAttachment,
            PostProcessBindable: postProcessBindable,
            ShadowMapAttachment: shadowMapAttachment,
            ShadowMapBindable: shadowMapBindable,
        }



        const bindGroups: IBindGroups = {
            RenderGeometryBindGroup: renderGeometryBindGroup,
            TexturesBindGroups: texturesBindGroups,
            BlurFilterBindGroupHorizontal: blurFilterBindGroupHorizontal,
            BlurFilterBindGroupVertical: blurFilterBindGroupVertical,
            PostProcessBindGroup: postProcessBindGroup,
            ShadowMapBindGroup: shadowMapBindGroup,
            DirectionalLightMatrixBindGroups: directionalLightMatrixBindGroups,
        }

        return {
            buffers,
            textures,
            bindGroups,
            OffsetData: geometryData.OffsetData,
        }
    }

    private CreateAttachmentTexture(format?: GPUTextureFormat, size?: [number, number, number?]) {
        return this.device.createTexture({
            size: size as [number, number] || [WorldSettings.Width, WorldSettings.Height],
            format: format || "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        })
    }

    private CreateBindableTexture(format?: GPUTextureFormat, size?: [number, number, number?]) {
        return this.device.createTexture({
            size: size as [number, number] || [WorldSettings.Width, WorldSettings.Height],
            format: format || "bgra8unorm",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        })
    }

    private CreateBasicPipeline(code: string, name: string, bindGroupLayoutEntries?: Iterable<GPUBindGroupLayoutEntry>) {
        const device = this.device

        const module = device.createShaderModule({
            label: `${name} module`,
            code: code,
        })

        const bindGroupLayout = device.createBindGroupLayout({
            label: `${name} Bindgroup Layout`,
            entries: bindGroupLayoutEntries || [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
            ]
        })

        const pipelineLayout = device.createPipelineLayout({
            label: `${name} Pipeline Layout`,
            bindGroupLayouts: [bindGroupLayout],
        })

        const pipeline = device.createRenderPipeline({
            label: `${name} pipeline`,
            layout: pipelineLayout,
            vertex: {
                module: module,
            },
            fragment: {
                module: module,
                targets: [
                    {format: "bgra8unorm"}
                ],
            }
        })

        const out: [GPURenderPipeline, GPUBindGroupLayout] = [pipeline, bindGroupLayout]
        return out
    }

    private DestroyGPUObjects(objects: GPUBuffer[] | GPUTexture[]) {
        objects.forEach(object => {
            object.destroy()
        })
    }
}











