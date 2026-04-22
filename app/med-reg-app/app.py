import os
import json
import streamlit as st
import fitz  # PyMuPDF
from docx import Document
import tkinter as tk
from tkinter import filedialog
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ==========================================
# 1. 页面配置
# ==========================================
st.set_page_config(page_title="SOP 分片向量化引擎", page_icon="🧩", layout="wide")

if 'sop_dir' not in st.session_state:
    st.session_state['sop_dir'] = os.path.abspath('./my_sops')
if 'export_dir' not in st.session_state:
    st.session_state['export_dir'] = os.path.abspath('./sop_shards')

def select_path(key):
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    path = filedialog.askdirectory(master=root) if key == 'sop_dir' else filedialog.askdirectory(master=root)
    root.destroy()
    if path: st.session_state[key] = path

# ==========================================
# 2. 核心逻辑
# ==========================================
def main():
    st.title("🧩 SOP 分片式向量库生成器")
    st.markdown("通过分片(Sharding)技术，让 Vue 前端能够按需加载，彻底解决大文件卡顿问题。")

    with st.sidebar:
        st.header("⚙️ 路径设置")
        st.session_state['sop_dir'] = st.text_input("📂 源 SOP 文件夹", value=st.session_state['sop_dir'])
        st.button("浏览源", on_click=select_path, args=('sop_dir',))
        
        st.session_state['export_dir'] = st.text_input("📦 导出分片文件夹", value=st.session_state['export_dir'])
        st.button("浏览导出", on_click=select_path, args=('export_dir',))
        
        st.divider()
        chunk_size = st.slider("✂️ 切块长度", 200, 1000, 600)
        chunk_overlap = st.slider("🔗 重叠区", 0, 300, 150)

    sop_dir = st.session_state['sop_dir']
    export_dir = st.session_state['export_dir']
    os.makedirs(export_dir, exist_ok=True)

    supported_files = [f for f in os.listdir(sop_dir) if f.endswith(('.pdf', '.docx'))]
    if not supported_files:
        st.warning("请在源文件夹中放入文件。")
        return

    st.metric("待处理文件", len(supported_files))

    if st.button("🚀 开始生成分片索引", type="primary", use_container_width=True):
        from fastembed import TextEmbedding
        model = TextEmbedding(model_name="BAAI/bge-small-zh-v1.5", cache_dir="./model_cache")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        index_map = []
        progress_bar = st.progress(0)
        log_area = st.empty()

        for idx, file_name in enumerate(supported_files):
            log_area.info(f"正在处理: {file_name}")
            file_path = os.path.join(sop_dir, file_name)
            
            # 1. 提取
            text = ""
            if file_name.endswith('.pdf'):
                with fitz.open(file_path) as doc:
                    for page in doc: text += page.get_text() + "\n"
            else:
                doc = Document(file_path)
                text = "\n".join([p.text for p in doc.paragraphs])

            # 2. 切块与注入上下文
            chunks = text_splitter.split_text(text)
            enriched_chunks = [f"【文件: {file_name}】\n内容: {c}" for c in chunks]
            
            # 3. 向量化
            embeddings = list(model.embed(enriched_chunks))
            
            # 4. 生成单个分片 JSON
            shard_data = [{
                "text": c, 
                "vector": e.tolist(), 
                "source": file_name
            } for c, e in zip(chunks, embeddings)]
            
            shard_filename = f"{file_name}.json"
            with open(os.path.join(export_dir, shard_filename), 'w', encoding='utf-8') as f:
                json.dump(shard_data, f, ensure_ascii=False)

            # 5. 更新索引表
            index_map.append({
                "file_name": file_name,
                "shard_file": shard_filename,
                "chunk_count": len(chunks)
            })
            
            progress_bar.progress((idx + 1) / len(supported_files))

        # 6. 保存全局索引表
        with open(os.path.join(export_dir, "index_map.json"), 'w', encoding='utf-8') as f:
            json.dump(index_map, f, ensure_ascii=False)

        st.balloons()
        st.success(f"🎉 分片库构建完成！请将 `{export_dir}` 文件夹内的所有文件拷贝至 Vue 项目的静态资源目录。")

if __name__ == "__main__":
    main()