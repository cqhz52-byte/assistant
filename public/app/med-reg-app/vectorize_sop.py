import os
import json
import streamlit as st
import tkinter as tk
from tkinter import filedialog

# ==========================================
# 1. 页面全局配置 (瞬间加载)
# ==========================================
st.set_page_config(
    page_title="SOP 向量化引擎",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 初始化 Session State，用于记忆路径
if 'sop_dir' not in st.session_state:
    st.session_state['sop_dir'] = os.path.abspath('./my_sops')
if 'output_json' not in st.session_state:
    st.session_state['output_json'] = os.path.abspath('./sop_knowledge_base.json')

# ==========================================
# 2. 原生图形化路径选择函数 (UI 层)
# ==========================================
def select_directory():
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    folder_path = filedialog.askdirectory(master=root, title="选择 SOP 体系文件夹")
    root.destroy()
    if folder_path:
        st.session_state['sop_dir'] = folder_path

def select_save_file():
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    file_path = filedialog.asksaveasfilename(
        master=root, 
        title="设置 JSON 库保存位置",
        defaultextension=".json", 
        filetypes=[("JSON 语义库", "*.json")]
    )
    root.destroy()
    if file_path:
        st.session_state['output_json'] = file_path

# ==========================================
# 3. UI 界面构建
# ==========================================
def main():
    st.title("📚 医疗 SOP 向量化管理中台")
    st.markdown("将本地质量体系文件（PDF/Word）一键转换为前端可用的高维语义索引库 `JSON`。")

    # --- 侧边栏配置区 ---
    with st.sidebar:
        st.header("⚙️ 引擎配置")
        
        # 图形化：SOP 文件夹路径
        st.markdown("**📂 SOP 文件夹路径**")
        col1, col2 = st.columns([3, 1])
        with col1:
            st.text_input("sop_dir", key="sop_dir", label_visibility="collapsed")
        with col2:
            st.button("浏览 📁", on_click=select_directory, use_container_width=True)

        # 图形化：输出 JSON 路径
        st.markdown("**💾 输出 JSON 路径**")
        col3, col4 = st.columns([3, 1])
        with col3:
            st.text_input("output_json", key="output_json", label_visibility="collapsed")
        with col4:
            st.button("浏览 💾", on_click=select_save_file, use_container_width=True)
        
        st.divider()
        model_name = st.selectbox("🧠 嵌入模型 (Embedding)", ["BAAI/bge-small-zh-v1.5", "BAAI/bge-large-zh-v1.5"])
        chunk_size = st.slider("✂️ 语义块切分长度 (字)", min_value=100, max_value=1000, value=400, step=50)
        batch_size = st.number_input("📦 推理批处理大小 (Batch)", min_value=1, max_value=64, value=8)

    # 自动创建缺省文件夹
    sop_dir = st.session_state['sop_dir']
    output_json = st.session_state['output_json']
    if not os.path.exists(sop_dir):
        try: os.makedirs(sop_dir)
        except: pass

    # --- 主区域：文件预览 ---
    st.subheader("📁 当前 SOP 库概览")
    
    if not os.path.exists(sop_dir):
        st.warning("⚠️ 指定的 SOP 文件夹不存在，请重新选择。")
        return

    supported_files = [f for f in os.listdir(sop_dir) if f.endswith(('.pdf', '.docx'))]
    
    if not supported_files:
        st.warning(f"在 `{sop_dir}` 中未找到 PDF 或 Word 文件，请先放入文件。")
        return

    file_col1, file_col2, file_col3 = st.columns(3)
    file_col1.metric("待处理 SOP 总数", f"{len(supported_files)} 份")
    file_col2.metric("当前切块策略", f"{chunk_size} 字 / 块")
    file_col3.metric("输出目标", os.path.basename(output_json))
    
    with st.expander("查看待处理文件明细", expanded=False):
        st.write(supported_files)

    st.divider()

    # --- 执行区域 ---
    if st.button("🚀 开始全功率向量化构建", type="primary", use_container_width=True):
        
        # ==========================================
        # 【核心优化】：懒加载重型 AI 依赖！
        # 只有用户点击了按钮，才会导入这些耗时的库
        # ==========================================
        with st.spinner("正在加载底层 AI 依赖与模型 (首次加载需数秒)..."):
            import fitz  
            from docx import Document
            from sentence_transformers import SentenceTransformer

            @st.cache_resource(show_spinner=False)
            def load_model(name):
                return SentenceTransformer(name)

            model = load_model(model_name)
            
            # 内部提取函数
            def extract_text(file_path):
                ext = os.path.splitext(file_path)[1].lower()
                text = ""
                try:
                    if ext == '.pdf':
                        with fitz.open(file_path) as doc:
                            for page in doc: text += page.get_text()
                    elif ext == '.docx':
                        doc = Document(file_path)
                        text = "\n".join([para.text for para in doc.paragraphs])
                except Exception as e:
                    st.error(f"读取 {file_path} 失败: {e}")
                return text

            def get_chunks(text, file_name, chunk_size):
                chunks = []
                for i in range(0, len(text), chunk_size):
                    content = text[i:i + chunk_size].strip()
                    if len(content) < 20: continue
                    chunks.append({
                        "content": f"文件:{file_name} | 内容:{content}",
                        "raw": content,
                        "metadata": {"source": file_name}
                    })
                return chunks

        st.success("✅ AI 引擎就绪，开始矩阵运算！")

        progress_bar = st.progress(0)
        status_text = st.empty()
        log_area = st.container()
        
        knowledge_base = []
        total_files = len(supported_files)

        for idx, file_name in enumerate(supported_files):
            file_path = os.path.join(sop_dir, file_name)
            status_text.text(f"正在解析: {file_name} ({idx+1}/{total_files})")
            
            raw_text = extract_text(file_path)
            file_chunks = get_chunks(raw_text, file_name, chunk_size)
            
            if not file_chunks:
                with log_area:
                    st.warning(f"⚠️ 跳过 {file_name}: 未提取到有效文本")
                continue
            
            # 批量加速处理
            texts_to_encode = [c['content'] for c in file_chunks]
            embeddings = model.encode(texts_to_encode, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=False)
            
            for chunk, emb in zip(file_chunks, embeddings):
                chunk['vector'] = emb.tolist()
                knowledge_base.append(chunk)
                
            with log_area:
                st.info(f"📄 {file_name} 处理完毕 -> 生成了 {len(file_chunks)} 个语义块")
            
            progress_bar.progress((idx + 1) / total_files)

        status_text.text("正在将矩阵数据写入硬盘...")
        
        os.makedirs(os.path.dirname(output_json), exist_ok=True)
        
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(knowledge_base, f, ensure_ascii=False)
        
        status_text.text("任务完成！")
        progress_bar.progress(1.0)
        st.balloons()
        
        st.success(f"🎉 构建大功告成！共生成 **{len(knowledge_base)}** 个结构化语义块！\n\n文件已保存至：`{output_json}`")

if __name__ == "__main__":
    main()