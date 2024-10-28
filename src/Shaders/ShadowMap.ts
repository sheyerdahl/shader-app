export default `
// @group(0) @binding(0) var<uniform> directionalLightMatrix: mat4x4f;
@group(0) @binding(0) var<storage> worldTransformationMatrixs: array<mat4x4f>;

@group(1) @binding(0) var<uniform> directionalLightMatrix: mat4x4f;

struct Vertex {
    @location(0) position: vec3f,
    @location(1) transformationIndex: f32,
}

@vertex
fn vertexMain(vertex: Vertex) -> @builtin(position) vec4f {
    let worldTransformation = worldTransformationMatrixs[u32(vertex.transformationIndex)];

    let worldPosition = (worldTransformationMatrixs[u32(vertex.transformationIndex)] * vec4f(vertex.position, 1)).xyz;
    let fragPosLightSpace = directionalLightMatrix * vec4(worldPosition.xyz, 1.0);
    // let transformedPosition = directionalLightMatrix * worldTransformation * vec4f(vertex.position, 1);
    // return vec4f(0.5, 0.5, 0.5, 1);
    return fragPosLightSpace;
}

@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
    return vec4f(1, 0, 0, 1);
    // return vec4f(position.z, position.z, position.z, 1);
}
`