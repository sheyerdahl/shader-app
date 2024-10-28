export default `
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var renderGeometryTexture: texture_2d<f32>;
@group(0) @binding(2) var bloomTexture: texture_2d<f32>;
@group(0) @binding(3) var depthTextureToRender: texture_depth_2d_array;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
    let vertices = array(
        // Left Triangle
        vec2f(-1, -1),
        vec2f(-1, 1),
        vec2f(1, 1),
        // Right Triangle
        vec2f(-1, -1),
        vec2f(1, 1),
        vec2f(1, -1),
    );

    return vec4f(vertices[vertexIndex], 1.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
    // let textureSize = textureDimensions(renderGeometryTexture);
    // let uv = vec2f(position.x / f32(textureSize.x), position.y / f32(textureSize.y));

    // let renderGeometryColor = textureSample(renderGeometryTexture, mySampler, uv);
    // let bloomTextureColor = textureSample(bloomTexture, mySampler, uv);

    // let finalColor = renderGeometryColor + bloomTextureColor;

    // return finalColor;

    let depthTextureSize = textureDimensions(depthTextureToRender);
    let uv = vec2f(position.x / f32(depthTextureSize.x) * 3.413, position.y / f32(depthTextureSize.y) * 3.413);

    let depth = textureSample(depthTextureToRender, mySampler, uv, 0);

    return vec4f(depth, depth, depth, 1);
}
`