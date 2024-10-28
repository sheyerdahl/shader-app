export default 
`
struct PointLight {
    @location(0) position: vec3f,
    @location(1) radius: f32,
    @location(2) color: vec4f,
    @location(3) brightness: f32,
}

struct Vertex {
    @location(0) position: vec3f,
    // @location(1) uv: vec2f,
    // @location(1) normal: vec3f,
    @location(2) color: vec4f,
    @location(3) transformationIndex: f32,
    @location(4) ignoreLighting: f32,
    // @location(3) textureId: f32,
    // @location(2) offset: vec3f,
    // @location(3) scale: vec3f,
    // @location(4) rotation: vec3f
}

struct VertexShaderOut {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) originalPosition: vec3f,
    @location(2) texcoord: vec2f,
    @location(3) worldPosition: vec3f,
    @interpolate(flat) @location(4) ignoreLighting: u32,
    // @location(5) shadowMapPosition: vec4f,
    // @interpolate(flat) @location(4) textureId: u32,
    // @location(1) scale: vec3f
}

struct FragmentShaderOut {
    @location(0) canvasColor: vec4f,
    @location(1) brightColor: vec4f,
}

// @group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
@group(0) @binding(1) var<storage> transformationMatrixs: array<mat4x4f>;
@group(0) @binding(2) var testTexture: texture_2d<f32>;
@group(0) @binding(3) var ourSampler: sampler;
@group(0) @binding(4) var<uniform> lightDirection: vec3f;
@group(0) @binding(5) var<storage> worldTransformationMatrixs: array<mat4x4f>;
@group(0) @binding(6) var<storage> pointLights: array<PointLight>;
@group(0) @binding(7) var<uniform> numPointLights: u32;
@group(0) @binding(8) var<storage> uvs: array<vec2f>;
@group(0) @binding(9) var<storage> directionalLightMatrices: array<mat4x4f>;
@group(0) @binding(10) var shadowMapTexture: texture_depth_2d_array;
@group(0) @binding(11) var shadowMapSampler: sampler;
@group(0) @binding(12) var<storage> cascadePlaneDistances: array<f32>;
@group(0) @binding(13) var<uniform> cameraView: mat4x4f;
@group(0) @binding(14) var<uniform> cameraFarPlane: f32;

@group(1) @binding(0) var selectedTexture: texture_2d<f32>;
@group(1) @binding(1) var<uniform> hasTexture: u32;

@vertex
fn vertexMain(vertex: Vertex, @builtin(instance_index) instanceIndex: u32, @builtin(vertex_index) vertexIndex: u32) -> VertexShaderOut {
    let transformationIndex = u32(vertex.transformationIndex);
    let transformationMatrix = transformationMatrixs[transformationIndex];
    let transformedPosition = transformationMatrix * vec4f(vertex.position, 1);

    // let shadowMapPosition = directionalLightMatrix * worldTransformationMatrixs[transformationIndex] * vec4f(vertex.position, 1);

    var output: VertexShaderOut;
    output.position = transformedPosition;
    output.color = vertex.color;
    output.originalPosition = vertex.position;
    // output.texcoord = vertex.uv;
    output.texcoord = (vec2f(vertex.position.xy) + 0.5) * 1;
    output.worldPosition = (worldTransformationMatrixs[transformationIndex] * vec4f(vertex.position, 1)).xyz;
    output.ignoreLighting = u32(vertex.ignoreLighting);
    // output.shadowMapPosition = shadowMapPosition;
    // output.textureId = u32(vertex.textureId);
    // output.scale = vertex.scale;

    return output;
}

@fragment
fn fragmentMain(data: VertexShaderOut) -> FragmentShaderOut {
    // let textureId = data.textureId;

    let textureColor = textureSample(selectedTexture, ourSampler, data.texcoord) * data.color;
    let lightAmbient = select(vec4f(0.5, 0.5, 0.5, 1), vec4f(1, 1, 1, 1), data.ignoreLighting == 1);
    // let combinedPosition = data.position.x + data.position.y + data.position.z;
    // let zColor = vec4f(data.originalPosition.z / 3, 0, 0, 1);
    // let textureColor = textureSample(testTexture, ourSampler, data.texcoord);
    // let dataColor = vec4f(min(1, data.worldPosition.x), min(1, data.worldPosition.y), min(1, data.worldPosition.z), 1);

    let baseColor = select(data.color, textureColor, hasTexture == 1);
    if (baseColor.a < 0.01) {
        discard;
    }
    let dx = dpdx(data.worldPosition);
    let dy = dpdy(data.worldPosition);
    let faceNormal = normalize(cross(dx, dy));
    let directionalLightingColorAllowed = max(0.0, -dot(faceNormal, lightDirection));
    
    var pointLightingColor = baseColor * lightAmbient;
    var test: f32;

    if (data.ignoreLighting == 0) {
        for (var i: u32 = 0; i < numPointLights; i++) {
            let pointLightPos = pointLights[i].position;
            let pointLightRadius = pointLights[i].radius;
            let pointLightColor = pointLights[i].color * pointLights[i].brightness;
            
            let lightWorldPos = data.worldPosition - pointLightPos;
            let distanceToLightNorm = sqrt(pow(lightWorldPos.x, 2) + pow(lightWorldPos.y, 2) + pow(lightWorldPos.z, 2)) / pointLightRadius;
            let lightFactor = 1 - distanceToLightNorm;
            test += pointLights[i].brightness;

            if (distanceToLightNorm > 1) {
                continue;
            };

            pointLightingColor *= vec4f(((pointLightColor * lightFactor) + 1).xyz, 1);
        };
    }

    // let finalColor = dataColor * vec4f(min(lightAmbient + directionalLightingColorAllowed, vec4f(1)).rgb, dataColor.a);
    
    // return vec4f(f32(numPointLights) / 5, 0, 0, 1);
    // return vec4f(test / 2, 0, 0, 1);

    // select cascade layer
    // let depthTextureSize = textureDimensions(depthTextureToRender);
    let cascadeCount = arrayLength(&cascadePlaneDistances);
    let fragPosViewSpace = cameraView * vec4(data.worldPosition, 1.0);
    let depthValue = abs(fragPosViewSpace.z);
        
    var layer: u32 = 9999;
    for (var i: u32 = 0; i < cascadeCount; i++) {
        if (depthValue < cascadePlaneDistances[i]) {
            layer = i;
            break;
        }
    }
    if (layer == 9999) {
        layer = cascadeCount;
    }
    
    let shadowMapSize = textureDimensions(shadowMapTexture).x;
    let oneOverSize = 1.0 / f32(shadowMapSize);
    let depthBias = 2.0 * oneOverSize;
    let normalOffset = faceNormal * 1;
    let fragPosLightSpace = directionalLightMatrices[layer] * vec4(data.worldPosition.xyz + (faceNormal * 0.5), 1.0);
    // var shadowMapUV = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // shadowMapUV = shadowMapUV * 0.5 + 0.5;
    let shadowMapUV = vec4(fragPosLightSpace.xy*vec2(0.5, -0.5) + vec2(0.5, 0.5), fragPosLightSpace.z, 1.0);

    let currentDepth = shadowMapUV.z;
    var shadow = 0.0;
    // if (currentDepth <= 1.0) {
        var bias = max(0.05 * (1.0 - dot(faceNormal, lightDirection)), 0.005);
        if (layer == cascadeCount) {
            bias *= 1 / (cameraFarPlane * 0.5);
        } else {
            bias *= 1 / (cascadePlaneDistances[layer] * 0.5);
        }

        // PCF
        // var shadow = 0.0;
        let texelSize = 1.0 / vec2f(textureDimensions(shadowMapTexture));
        for(var x: i32 = -1; x <= 1; x++) {
            for(var y: i32 = -1; y <= 1; y++) {
                let offset = vec2(f32(x) * oneOverSize, f32(y) * oneOverSize);
                // let pcfDepth = textureSample(shadowMapTexture, shadowMapSampler, shadowMapUV.xy + vec2f(f32(x), f32(y)) * texelSize, layer);
                let pcfDepth = textureSample(shadowMapTexture, shadowMapSampler, shadowMapUV.xy + offset, layer);
                shadow += select(1.0, 0.0, currentDepth - depthBias > pcfDepth);
                // shadow += select(1.0, 0.0, currentDepth - bias > pcfDepth);
            }
        }
        shadow /= 9.0;
            
        // keep the shadow at 0.0 when outside the far_plane region of the light's frustum.
        if (currentDepth > 1.0) {
            shadow = 0.0;
        }
    // }

    let shadowColor = max(0.1, shadow);

    // let worldTransformation = worldTransformationMatrixs[u32(vertex.transformationIndex)]; TEMPORARILY HERE for comparison with ShadowMap.wgsl
    // let transformedPosition = directionalLightMatrix * worldTransformation * vec4f(vertex.position, 1);

    // let shadowMapUV = (data.shadowMapPosition.xyz / data.shadowMapPosition.w) * 0.5 + 0.5; // Can try modifying this incase not working

    // let shadowDepth = textureSample(shadowMapTexture, shadowMapSampler, shadowMapUV.xy, layer);
    // let shadowColor = select(0.1, 1, shadowMapUV.z > shadowDepth);
    var cascadeColor: vec4f;
    if (layer == 0) {
        cascadeColor = vec4f(1, 0, 0, 1);
    } else if (layer == 1) {
        cascadeColor = vec4f(0, 1, 0, 1);
    } else if (layer == 2) {
        cascadeColor = vec4f(0, 0, 1, 1);
    } else if (layer == 3) {
        cascadeColor = vec4f(1, 1, 0, 1);
    } else if (layer == 4) {
        cascadeColor = vec4f(1, 0, 1, 1);
    } else if (layer == 5) {
        cascadeColor = vec4f(1, 1, 1, 1);
    }

    // let finalColor = cascadeColor;
    let finalColor = pointLightingColor * vec4f(shadowColor, shadowColor, shadowColor, 1);
    // let finalColor = pointLightingColor;
    // let finalColor = vec4f(shadowMapUV.xy, 0, 1);

    var output: FragmentShaderOut;
    output.canvasColor = finalColor;

    let brightness = dot(finalColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    if(brightness > 0.95) {
        output.brightColor = vec4f(finalColor.rgb, 1.0);
    } else {
        output.brightColor = vec4f(0.0, 0.0, 0.0, 1.0);
    }

    return output;
}
`