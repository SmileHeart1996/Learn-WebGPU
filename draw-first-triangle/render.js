(async () => {
    if(navigator.gpu === undefined) {
        alert('WebGPU is not supported/enabled in your browser');
        return;
    }
    //  获取WebGPU接口实例来访问和操纵GPU渲染
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    // 获取呈现渲染结果的canvas上下文
    const canvas = document.querySelector('#webgpu-canvas');
    const context = canvas.getContext('webgpu');

    // 设置shader模块
    const shaderCode = `
        type float4 = vec4<f32>;
        struct VertexInput {
            [[location(0)]] position: float4;
            [[location(1)]] color: float4;
        }
        struct VertexOutput {
            [[builtin(position)]] position: float4;
            [[location(0)]] color: float4;
        }
        
        [[stage(vertex)]]
        fn vertex_main(vertex: VertexInput) -> VertexOutput {
            let out: VertexOutput;
            out.color = vertex.color;
            out.position = vertex.position;
            return out;
        };

        [[stage(fragment)]]
        fn fragment_main(in: VertexOutput) -> [[location(0)]] float4 {
            return float4(in.color);
        }
    `;
    const shaderModule = device.createShaderModule({code: shaderCode});
    if (shaderModule.compilationInfo) {
        const compilationInfo = await shaderModule.compilationInfo();
        if (compilationInfo.messages.length > 0) {
            let hadError = false;
            console.log("Shader compilation log:");
            for(let i = 0; i < compilationInfo.messages.length; i++) {
                const msg = compilationInfo.messages[i];
                console.log(`${msg.lineNum}:${msg.linePos} - ${msg.message}`);
                hadError = hadError || msg.type == "error";
            }
            if(hadError) {
                console.log("Shader failed to compile");
                return;
            }
        }
    }
    // 上传顶点数据
    // createBuffer会返回一个包含GPUBuffer和ArrayBuffer的实例对象
    const dataBuffer = device.createBuffer({
        size: 3 * 2 * 4 * 4,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(dataBuffer.getMappedRange()).set([
        1, -1, 0, 1,
        1, 0, 0, 1,
        -1, -1, 0, 1,
        0, 1, 0, 1,
        0, 1, 0, 1,
        0, 0, 1, 1,
    ]);
    dataBuffer.unmap();

    // 设置渲染输出形式
    const vertexState = {
        module: shaderModule,
        entryPoint: 'vertex_main',
        buffers: [{
            arrayStride: 2 * 4 * 4,
            attributes: [
                {format: "float32x4", offset: 0, shaderLocation: 0},
                {format: "float32x4", offset: 4 * 4, shaderLocation: 1}
            ]
        }]
    };

    const swapChainFormat = "bgra8unorm";
    context.configure({
        device: device,
        format: swapChainFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    const depthFormat = "depth24plus-stencil8";
    const depthTexture = device.createTexture({
        size: {
            width: canvas.width,
            height: canvas.height,
            depth: 1,
        },
        format: depthFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    const fragmentState = {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [{format: swapChainFormat}]
    };

    // 创建渲染管道
    const layout = device.createPipelineLayout({bindGroupLayouts: []});
    const renderPipeline = device.createRenderPipeline({
        layout: layout,
        vertex: vertexState,
        fragment: fragmentState,
        depthStencil: {format: depthFormat, depthWriteEnabled: true, depthCompare: "less"}
    });

    // 渲染
    const renderPassDesc = {
        colorAttachments: [{view: undefined, loadValue: [0.3, 0.3, 0.3, 1]}],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadValue: 1.0,
            depthStoreOp: "store",
            stencilLoadValue: 0,
            stencilStoreOp: "store"
        }
    };

    const frame = function() {
        renderPassDesc.colorAttachments[0].view = context.getCurrentTexture().createView();
        var commandEncoder = device.createCommandEncoder();
        var renderPass = commandEncoder.beginRenderPass(renderPassDesc);
        renderPass.setPipeline(renderPipeline);
        renderPass.setVertexBuffer(0, dataBuf);
        renderPass.draw(3, 1, 0, 0);
        renderPass.endPass();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
})();