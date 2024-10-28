export default `
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var textureToBlur: texture_2d<f32>;
@group(0) @binding(2) var<uniform> horizontal: u32;

const weights = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

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
    let textureSize = textureDimensions(textureToBlur);
    let uv = vec2f(position.x / f32(textureSize.x), position.y / f32(textureSize.y));

    let tex_offset = 1.0 / vec2f(textureSize); // gets size of single texel
    var result = textureSample(textureToBlur, mySampler, uv).rgb * weights[0]; // current fragment's contribution

    var test = 0.0;

    if (horizontal == 1) {
        test += 0.5;
        for (var i: u32 = 1; i < 5; i++) {
            result += textureSample(textureToBlur, mySampler, uv + vec2f(tex_offset.x * f32(i), 0.0)).rgb * weights[i];
            result += textureSample(textureToBlur, mySampler, uv - vec2f(tex_offset.x * f32(i), 0.0)).rgb * weights[i];
        }
    } else {
        // test += 0.5;
        for (var i: u32 = 1; i < 5; i++) {
            result += textureSample(textureToBlur, mySampler, uv + vec2f(0.0, tex_offset.y * f32(i))).rgb * weights[i];
            result += textureSample(textureToBlur, mySampler, uv - vec2f(0.0, tex_offset.y * f32(i))).rgb * weights[i];
        }
    }

    // return vec4f(test, 0, 0, 1);
    return vec4(result, 1.0);
}
`