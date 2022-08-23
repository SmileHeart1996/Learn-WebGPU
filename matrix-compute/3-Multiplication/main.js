(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if(!adapter) return;
    const device = await adapter.requestDevice();

    const firstMatrix = new Float32Array([
        2, 4,
        1, 2, 3, 4,
        5, 6, 7, 8,
    ])
    const firstMatrixBuffer = device.createBuffer({
        mappedAtCreation: true,
        size: firstMatrix.byteLength,
        usage: GPUBufferUsage.STORAGE,
    });
    new Float32Array(firstMatrixBuffer.getMappedRange()).set(firstMatrix);
    firstMatrixBuffer.unmap();

    const secondMatrix = new Float32Array([
        4, 2,
        1, 2,
        3, 4,
        5, 6,
        7, 8,
    ])
    const secondMatrixBuffer = device.createBuffer({
        mappedAtCreation: true,
        size: secondMatrix.byteLength,
        usage: GPUBufferUsage.STORAGE,
    });
    new Float32Array(secondMatrixBuffer.getMappedRange()).set(secondMatrix);
    secondMatrixBuffer.unmap();

    const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * (2 + firstMatrix[0] * secondMatrix[1]);
    const resultMatrixBuffer = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const gpuReadBuffer = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const shaderModule = device.createShaderModule({
        code: `
            struct Matrix {
                size: vec2<f32>,
                numbers: array<f32>,
            }
            @group(0) @binding(0) var<storage, read> firstMatrix: Matrix;
            @group(0) @binding(1) var<storage, read> secondMatrix: Matrix;
            @group(0) @binding(2) var<storage, read_write> resultMatrix: Matrix;

            @compute @workgroup_size(8, 8)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                if(global_id.x >= u32(firstMatrix.size.x) || global_id.y >= u32(secondMatrix.size.y)) {
                    return;
                }
                resultMatrix.size = vec2(firstMatrix.size.x, secondMatrix.size.y);
                let resultCell = vec2(global_id.x, global_id.y);
                var result = 0.0;
                for(var i = 0u; i < u32(firstMatrix.size.y); i = i + 1u) {
                    let a = i + resultCell.x * u32(firstMatrix.size.y);
                    let b = resultCell.y + i * u32(secondMatrix.size.y);
                    result = result + firstMatrix.numbers[a] * secondMatrix.numbers[b];
                }

                let index = resultCell.y + resultCell.x * u32(secondMatrix.size.y);
                resultMatrix.numbers[index] = result;
            }
        `
    });
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: shaderModule,
            entryPoint: "main",
        }
    });

    const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: firstMatrixBuffer
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: secondMatrixBuffer
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: resultMatrixBuffer
                }
            }
        ]
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    const workgroupCountX = Math.ceil(firstMatrix[0] / 8);
    const workgroupCountY = Math.ceil(secondMatrix[1] / 8);
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY);
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(resultMatrixBuffer, 0, gpuReadBuffer, 0, resultMatrixBufferSize);
    const gpuCommands = commandEncoder.finish();
    device.queue.submit([gpuCommands]);

    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = gpuReadBuffer.getMappedRange();
    console.log(new Float32Array(arrayBuffer));
})();