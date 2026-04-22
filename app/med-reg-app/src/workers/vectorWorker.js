import { pipeline, env } from '@xenova/transformers';

// ==========================================
// 【算力解锁 1】：开启 WebAssembly 多线程并发
// 自动获取当前电脑的 CPU 核心数，并榨干它们！
// ==========================================
if (navigator.hardwareConcurrency) {
    // 留一个线程给主界面保持流畅，其余全部用于矩阵运算
    env.backends.onnx.wasm.numThreads = Math.max(1, navigator.hardwareConcurrency - 1);
}
env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/bge-small-zh-v1.5';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                progress_callback,
                quantized: true
            });
        }
        return this.instance;
    }
}

function structuralChunking(text, fileName) {
    const chunks = [];
    const sections = text.split(/(?=^第[一二三四五六七八九十]+[章条])|(?=^\d+\.\d+)/gm);
    let lastHeader = '通用条款';

    sections.forEach(s => {
        const trimmed = s.trim();
        if (trimmed.length < 15) return;
        
        const header = trimmed.match(/^([^\n]{2,30})/)?.[1] || lastHeader;
        lastHeader = header;
        
        // 限制长度，防止显存/内存溢出
        const safeContent = trimmed.length > 400 ? trimmed.substring(0, 400) : trimmed;

        chunks.push({
            content: `文件:${fileName} | 章节:${header} | 内容:${safeContent}`,
            raw: safeContent,
            metadata: { source: fileName, header }
        });
    });
    return chunks;
}

self.addEventListener('message', async (e) => {
    const { action, text, fileName } = e.data;
    
    if (action === 'load') {
        await PipelineSingleton.getInstance(d => self.postMessage({ status: 'progress', data: d }));
        self.postMessage({ status: 'ready' });
    } 
    else if (action === 'process') {
        try {
            const extractor = await PipelineSingleton.getInstance();
            const chunks = structuralChunking(text, fileName);
            const results = [];

            self.postMessage({ status: 'start_compute', fileName, total: chunks.length });

            // ==========================================
            // 【算力解锁 2】：矩阵批处理 (Batch Processing)
            // 不要一条一条算！一次性打包发送多条给 ONNX 引擎，
            // 充分利用底层 CPU 向量指令集 (AVX/SIMD)，速度可提升 3~5 倍！
            // ==========================================
            const BATCH_SIZE = 8; // 批处理大小（如果电脑性能极强可调为 16）

            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                // 截取当前批次
                const batchChunks = chunks.slice(i, i + BATCH_SIZE);
                // 提取文本数组: ['句子1', '句子2', ...]
                const textsToEmbed = batchChunks.map(c => c.content);

                // 批量执行推理！这会比单独执行快非常多
                const output = await extractor(textsToEmbed, { pooling: 'mean', normalize: true });

                // 将批量计算出的高维向量结果，分别塞回对应的块中
                // Transformers.js 批量输出的结构为二维 Tensor
                const vectorsArray = output.tolist(); 

                for (let j = 0; j < batchChunks.length; j++) {
                    results.push({ ...batchChunks[j], vector: vectorsArray[j] });
                }
                
                // 汇报微观进度
                const currentProcessed = Math.min(i + BATCH_SIZE, chunks.length);
                self.postMessage({ status: 'chunk_progress', fileName, current: currentProcessed, total: chunks.length });
            }
            
            self.postMessage({ status: 'complete', fileName, vectors: results });
        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    }
});