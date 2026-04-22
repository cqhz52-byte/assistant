<template>
  <div class="workbench">
    <section class="column panel left-col">
      <div class="panel-header">
        <h2>📝 新法规输入</h2>
      </div>
      <div class="panel-body">
        <DiffViewer />
      </div>
    </section>

    <section class="column panel middle-col">
      <div class="panel-header">
        <h2>📂 本地 SOP 体系库</h2>
      </div>
      <div class="panel-body">
        <FileExplorer />
        <VectorSearch />
      </div>
    </section>

    <section class="column panel right-col">
      <div class="panel-header">
        <h2>🧠 AI 分析报告 (多模态)</h2>
      </div>
      <div class="panel-body report-bg">
        <AiReport />
      </div>
    </section>
  </div>
</template>

<script setup>
// 引入即将要写的子组件
import DiffViewer from '../components/DiffViewer.vue'
import FileExplorer from '../components/FileExplorer.vue'
import VectorSearch from '../components/VectorSearch.vue'
import AiReport from '../components/AiReport.vue'
</script>

<style scoped>
.workbench {
  display: flex;
  width: 100%;
  gap: 20px;
  height: calc(100vh - 112px); /* 减去头部和上下 padding 的高度 */
}

.column {
  display: flex;
  flex-direction: column;
}

.left-col { flex: 2.5; }
.middle-col { flex: 3.5; }
.right-col { flex: 4; }

.panel {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.panel-header h2 {
  margin: 0;
  font-size: 16px;
  color: #334155;
  font-weight: 600;
}

.panel-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto; /* 内容过多时在当前区块内滚动 */
}

/* 报告区稍微给个不同的底色 */
.report-bg {
  background-color: #fafaf9;
}
</style>