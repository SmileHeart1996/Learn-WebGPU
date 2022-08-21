(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if(!adapter) return;
    const device = await adapter.requestDevice();

    const gpuWriteBuffer = device.createBuffer({
        mappedAtCreation: true,
        size: 4,
        usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
    });
    const arrayBuffer = gpuWriteBuffer.getMappedRange();
    // gpuWriteBuffer.unmap();
    new Uint8Array(arrayBuffer).set([0, 1, 2, 3]);
    gpuWriteBuffer.unmap();  // 注释试试

    const gpuReadBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ // 注释试试
    });

    const copyEncoder = device.createCommandEncoder();
    copyEncoder.copyBufferToBuffer(gpuWriteBuffer, 0, gpuReadBuffer, 0, 4);
    const copyCommands = copyEncoder.finish();
    device.queue.submit([copyCommands]);

    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const copyArrayBuffer = gpuReadBuffer.getMappedRange();
    console.log(new Uint8Array(copyArrayBuffer));
})();