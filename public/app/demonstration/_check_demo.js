
    const steps = [
      {
        id: "boot",
        phase: "开机",
        title: "设备开机与品牌识别",
        desc: "确认设备软件版本与界面版本正常显示。",
        image: "./界面截图CN/1.bmp",
        guide: "开机后停留 3-5 秒，核对 Logo、软件版本号、UI 版本号。",
        fields: []
      },
      {
        id: "operator",
        phase: "信息录入",
        title: "录入操作者信息",
        desc: "填写手术时间、医生姓名与注意事项。",
        image: "./界面截图CN/3操作者信息.bmp",
        guide: "进入“医生信息”界面，依次录入手术时间、医生姓名、注意事项。",
        fields: [
          { key: "surgeryTime", label: "手术时间", type: "text", placeholder: "例如 2026-04-20 09:30" },
          { key: "doctorName", label: "医生姓名", type: "text", placeholder: "请输入姓名" },
          { key: "note", label: "注意事项", type: "text", placeholder: "例如 禁止误触脚踏" }
        ]
      },
      {
        id: "patient",
        phase: "信息录入",
        title: "录入患者信息",
        desc: "填写患者ID、姓名、年龄与患者数据备注。",
        image: "./界面截图CN/4患者信息.bmp",
        guide: "切换至“患者信息”，录入患者基础信息，避免空字段提交。",
        fields: [
          { key: "patientId", label: "患者ID", type: "text", placeholder: "例如 P2026042001" },
          { key: "patientName", label: "姓名", type: "text", placeholder: "请输入患者姓名" },
          { key: "patientAge", label: "年龄", type: "number", placeholder: "例如 57" }
        ]
      },
      {
        id: "target",
        phase: "治疗规划",
        title: "设置损毁区与目标区",
        desc: "输入几何尺寸并确认边缘安全距离。",
        image: "./界面截图CN/5.bmp",
        guide: "根据影像评估填写损毁区与目标区长宽高，确认边缘距离。",
        fields: [
          { key: "lesionL", label: "损毁长cm", type: "number", placeholder: "1.0" },
          { key: "lesionW", label: "损毁宽cm", type: "number", placeholder: "1.0" },
          { key: "lesionH", label: "损毁高cm", type: "number", placeholder: "1.0" },
          { key: "targetL", label: "目标长cm", type: "number", placeholder: "3.0" },
          { key: "targetW", label: "目标宽cm", type: "number", placeholder: "3.0" },
          { key: "targetH", label: "目标高cm", type: "number", placeholder: "3.0" },
          { key: "margin", label: "边缘cm", type: "number", placeholder: "1.0" }
        ]
      },
      {
        id: "organ",
        phase: "治疗规划",
        title: "选择器官与模式",
        desc: "选择器官类型、单极/双极模式及PPM同步策略。",
        image: "./界面截图CN/6.bmp",
        guide: "按临床计划选择器官与治疗模式，确认PPM及ECG同步设置。",
        fields: [
          { key: "organ", label: "器官", type: "select", options: ["肝脏", "肺部", "胰腺", "肾脏", "前列腺"] },
          { key: "mode", label: "模式", type: "select", options: ["单极性模式", "双极性模式"] },
          { key: "ppm", label: "PPM", type: "select", options: ["60", "90", "120", "240"] },
          { key: "ecgSync", label: "ECG同步", type: "select", options: ["关闭", "开启"] }
        ]
      },
      {
        id: "electrode",
        phase: "电极配置",
        title: "选择电极配置",
        desc: "根据通道数选择电极点位。",
        image: "./界面截图CN/7.bmp",
        guide: "进入电极配置，选择与规划一致的针道与通道组合。",
        fields: [
          { key: "electrodeLayout", label: "电极布局", type: "select", options: ["2点", "4点", "5点", "6点"] }
        ]
      },
      {
        id: "parameterRaw",
        phase: "参数设置",
        title: "设置基础参数",
        desc: "脉宽、场强、数量、PPM、间距与电压参数录入。",
        image: "./界面截图CN/8.bmp",
        guide: "录入基础参数后，先观察通道1/2切换状态，再继续。",
        fields: [
          { key: "pulseWidth", label: "脉宽us", type: "number", placeholder: "100" },
          { key: "fieldStrength", label: "场强V/cm", type: "number", placeholder: "1500" },
          { key: "count", label: "数量", type: "number", placeholder: "90" },
          { key: "ppmSet", label: "PPM", type: "number", placeholder: "60" },
          { key: "spacing", label: "间距cm", type: "number", placeholder: "1.0" },
          { key: "voltageSet", label: "电压V", type: "number", placeholder: "1500" }
        ]
      },
      {
        id: "parameterCard",
        phase: "参数设置",
        title: "参数卡片复核",
        desc: "以卡片形式复核关键参数并确认。",
        image: "./界面截图CN/9.bmp",
        guide: "检查6项参数卡片与预期一致，点击确认进入下一步。",
        fields: []
      },
      {
        id: "channelConfirm",
        phase: "通道确认",
        title: "通道映射确认",
        desc: "核对通道1/2映射关系并确认。",
        image: "./界面截图CN/10.bmp",
        guide: "确认通道环形映射关系，避免通道与针道错配。",
        fields: [
          { key: "channelStrategy", label: "通道策略", type: "select", options: ["顺时针", "逆时针", "固定映射"] }
        ]
      },
      {
        id: "voltagePage",
        phase: "设备状态",
        title: "电压与充放电状态页",
        desc: "查看测试、充电、放电三状态。",
        image: "./界面截图CN/11.bmp",
        guide: "确认设备电压监测正常，充放电按流程可触发。",
        fields: []
      },
      {
        id: "preStart",
        phase: "设备状态",
        title: "启动前状态检查",
        desc: "核对计数、电压、电流、阻抗四项。",
        image: "./界面截图CN/12.bmp",
        guide: "确保计数、电压、电流、阻抗显示在允许范围，再启动。",
        fields: []
      },
      {
        id: "monitor",
        phase: "监测",
        title: "波形与趋势监测",
        desc: "实时观察电压、电流、阻抗趋势。",
        image: "./界面截图CN/13.bmp",
        guide: "关注曲线波动和异常值，必要时暂停并回溯参数。",
        fields: []
      },
      {
        id: "output",
        phase: "输出",
        title: "输出功率页（初始）",
        desc: "查看功率设置、输出功率、阻抗、凝血针道。",
        image: "./界面截图CN/14.bmp",
        guide: "启动输出前记录初始值，作为术后追溯基线。",
        fields: [
          { key: "powerSet", label: "功率设置W", type: "number", placeholder: "0" },
          { key: "needleChannel", label: "凝血针道", type: "number", placeholder: "0" }
        ]
      },
      {
        id: "outputRunning",
        phase: "输出",
        title: "输出功率页（运行中）",
        desc: "运行中参数以实时值展示。",
        image: "./界面截图CN/14-1.bmp",
        guide: "运行中重点观察功率与阻抗变化，若超阈值立即停机。",
        fields: []
      },
      {
        id: "recordPage",
        phase: "记录",
        title: "记录文件浏览",
        desc: "浏览导出的记录文件和页码。",
        image: "./界面截图CN/15.bmp",
        guide: "核对记录文件完整性，确认当前页与导出文件对应。",
        fields: []
      },
      {
        id: "reviewPage",
        phase: "复核",
        title: "参数复核总览",
        desc: "汇总患者信息、设置参数、工作参数并执行确认。",
        image: "./界面截图CN/16.bmp",
        guide: "复核三栏内容一致后点击确认，完成本次流程。",
        fields: []
      },
      {
        id: "settings",
        phase: "系统设置",
        title: "系统时间/亮度/音量/语言",
        desc: "确认系统基础设置，适配手术场景。",
        image: "./界面截图CN/17.bmp",
        guide: "按手术室环境设置亮度音量，语言保持中文或按需切换。",
        fields: [
          { key: "language", label: "语言", type: "select", options: ["中文", "English"] }
        ]
      },
      {
        id: "version",
        phase: "系统设置",
        title: "版本信息核验",
        desc: "核验硬件、界面、软件发布与完整版本。",
        image: "./界面截图CN/18.bmp",
        guide: "演示结束前进行版本核验，形成培训闭环。",
        fields: []
      }
    ];

    const defaultForm = {
      surgeryTime: "",
      doctorName: "",
      note: "",
      patientId: "",
      patientName: "",
      patientAge: "",
      lesionL: "1.0",
      lesionW: "1.0",
      lesionH: "1.0",
      targetL: "3.0",
      targetW: "3.0",
      targetH: "3.0",
      margin: "1.0",
      organ: "肝脏",
      mode: "双极性模式",
      ppm: "60",
      ecgSync: "关闭",
      electrodeLayout: "4点",
      pulseWidth: "100",
      fieldStrength: "1500",
      count: "90",
      ppmSet: "60",
      spacing: "1.0",
      voltageSet: "1500",
      channelStrategy: "顺时针",
      powerSet: "0",
      needleChannel: "0",
      language: "中文"
    };

    const pxRect = (x, y, w, h, extra = {}) => ({
      unit: "px",
      baseWidth: 1024,
      baseHeight: 600,
      x,
      y,
      w,
      h,
      ...extra
    });

    const hotspotPresets = {
      operator: [
        pxRect(500, 164, 190, 40, { kind: "input", key: "surgeryTime", placeholder: "手术时间" }),
        pxRect(500, 206, 190, 40, { kind: "input", key: "doctorName", placeholder: "医生姓名" }),
        pxRect(308, 290, 382, 42, { kind: "input", key: "note", placeholder: "注意事项" }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      patient: [
        pxRect(500, 164, 190, 40, { kind: "input", key: "patientId", placeholder: "患者ID" }),
        pxRect(500, 206, 190, 40, { kind: "input", key: "patientName", placeholder: "姓名" }),
        pxRect(500, 248, 190, 40, { kind: "input", key: "patientAge", placeholder: "年龄" }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      target: [
        pxRect(404, 221, 104, 45, { kind: "input", key: "lesionL", placeholder: "长" }),
        pxRect(404, 266, 104, 45, { kind: "input", key: "lesionW", placeholder: "宽" }),
        pxRect(404, 311, 104, 45, { kind: "input", key: "lesionH", placeholder: "高" }),
        pxRect(608, 221, 104, 45, { kind: "input", key: "targetL", placeholder: "长" }),
        pxRect(608, 266, 104, 45, { kind: "input", key: "targetW", placeholder: "宽" }),
        pxRect(608, 311, 104, 45, { kind: "input", key: "targetH", placeholder: "高" }),
        pxRect(509, 357, 96, 44, { kind: "input", key: "margin", placeholder: "边缘" }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      organ: [
        pxRect(354, 110, 90, 84, { kind: "button", label: "肝脏", key: "organ", value: "肝脏" }),
        pxRect(468, 110, 90, 84, { kind: "button", label: "肺部", key: "organ", value: "肺部" }),
        pxRect(581, 110, 90, 84, { kind: "button", label: "胰腺", key: "organ", value: "胰腺" }),
        pxRect(354, 217, 90, 84, { kind: "button", label: "肾脏", key: "organ", value: "肾脏" }),
        pxRect(468, 217, 90, 84, { kind: "button", label: "前列腺", key: "organ", value: "前列腺" }),
        pxRect(356, 371, 122, 58, { kind: "button", label: "单极", key: "mode", value: "单极性模式" }),
        pxRect(548, 371, 122, 58, { kind: "button", label: "双极", key: "mode", value: "双极性模式" }),
        pxRect(149, 502, 129, 52, { kind: "button", label: "PPM 60", key: "ppm", value: "60" }),
        pxRect(303, 502, 129, 52, { kind: "button", label: "PPM 90", key: "ppm", value: "90" }),
        pxRect(456, 502, 129, 52, { kind: "button", label: "PPM 120", key: "ppm", value: "120" }),
        pxRect(609, 502, 129, 52, { kind: "button", label: "PPM 240", key: "ppm", value: "240" }),
        pxRect(761, 502, 129, 52, { kind: "button", label: "ECG同步", key: "ecgSync", value: "开启" }),
        pxRect(792, 516, 196, 72, { kind: "button", label: "确认选择", run: true, next: true }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      electrode: [
        pxRect(160, 261, 48, 48, { kind: "button", label: "2点", key: "electrodeLayout", value: "2点" }),
        pxRect(281, 246, 66, 64, { kind: "button", label: "4点", key: "electrodeLayout", value: "4点" }),
        pxRect(419, 246, 66, 64, { kind: "button", label: "4点", key: "electrodeLayout", value: "4点" }),
        pxRect(144, 361, 66, 64, { kind: "button", label: "5点", key: "electrodeLayout", value: "5点" }),
        pxRect(281, 361, 66, 64, { kind: "button", label: "6点", key: "electrodeLayout", value: "6点" }),
        pxRect(419, 361, 66, 64, { kind: "button", label: "6点", key: "electrodeLayout", value: "6点" }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      parameterRaw: [
        pxRect(86, 150, 67, 43, { kind: "input", key: "pulseWidth", placeholder: "脉宽" }),
        pxRect(164, 150, 77, 43, { kind: "input", key: "fieldStrength", placeholder: "场强" }),
        pxRect(244, 150, 52, 43, { kind: "input", key: "count", placeholder: "数量" }),
        pxRect(311, 150, 52, 43, { kind: "input", key: "ppmSet", placeholder: "PPM" }),
        pxRect(377, 150, 52, 43, { kind: "input", key: "spacing", placeholder: "间距" }),
        pxRect(441, 150, 72, 43, { kind: "input", key: "voltageSet", placeholder: "电压" }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      parameterCard: [
        pxRect(546, 150, 52, 44, { kind: "button", label: "通道1", key: "channelStrategy", value: "顺时针" }),
        pxRect(606, 150, 52, 44, { kind: "button", label: "通道2", key: "channelStrategy", value: "逆时针" }),
        pxRect(331, 499, 140, 50, { kind: "button", label: "确认", run: true, next: true })
      ],
      channelConfirm: [
        pxRect(547, 150, 52, 44, { kind: "button", label: "通道1", key: "channelStrategy", value: "顺时针" }),
        pxRect(607, 150, 52, 44, { kind: "button", label: "通道2", key: "channelStrategy", value: "逆时针" }),
        pxRect(826, 515, 136, 50, { kind: "button", label: "确认", run: true, next: true })
      ],
      voltagePage: [
        pxRect(706, 208, 96, 96, { kind: "button", label: "测试", log: "已点击：测试" }),
        pxRect(637, 362, 95, 95, { kind: "button", label: "充电", log: "已点击：充电" }),
        pxRect(767, 362, 95, 95, { kind: "button", label: "放电", log: "已点击：放电" }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      preStart: [
        pxRect(470, 494, 104, 91, { kind: "button", label: "开始", run: true, next: true }),
        pxRect(975, 430, 38, 70, { kind: "button", label: "上一页", prev: true }),
        pxRect(975, 518, 38, 70, { kind: "button", label: "下一页", next: true })
      ],
      output: [
        pxRect(522, 131, 93, 58, { kind: "input", key: "powerSet", placeholder: "功率设置" }),
        pxRect(830, 258, 92, 62, { kind: "input", key: "needleChannel", placeholder: "针道" }),
        pxRect(799, 409, 129, 105, { kind: "button", label: "启动输出", run: true, next: true })
      ],
      recordPage: [
        pxRect(99, 516, 34, 74, { kind: "button", label: "上一页", prev: true }),
        pxRect(874, 508, 38, 80, { kind: "button", label: "下一页", next: true })
      ],
      reviewPage: [
        pxRect(904, 318, 90, 64, { kind: "button", label: "删除" }),
        pxRect(882, 476, 112, 95, { kind: "button", label: "确认", run: true, next: true })
      ],
      settings: [
        pxRect(380, 398, 122, 48, { kind: "button", label: "中文", key: "language", value: "中文" }),
        pxRect(617, 396, 176, 50, { kind: "button", label: "English", key: "language", value: "English" })
      ]
    };

    const state = {
      current: 0,
      autoTimer: null,
      form: { ...defaultForm },
      done: {},
      logs: [],
      ui: {
        activeHotspotId: ""
      }
    };

    const stepList = document.getElementById("stepList");
    const viewerTitle = document.getElementById("viewerTitle");
    const viewerDesc = document.getElementById("viewerDesc");
    const phaseTag = document.getElementById("phaseTag");
    const stepImage = document.getElementById("stepImage");
    const hotspotLayer = document.getElementById("hotspotLayer");
    const opGuide = document.getElementById("opGuide");
    const operationFields = document.getElementById("operationFields");
    const progressText = document.getElementById("progressText");
    const progressFill = document.getElementById("progressFill");
    const summaryGrid = document.getElementById("summaryGrid");
    const logList = document.getElementById("logList");

    function nowText() {
      const d = new Date();
      return d.toLocaleTimeString("zh-CN", { hour12: false });
    }

    function addLog(message) {
      state.logs.unshift({ t: nowText(), message });
      state.logs = state.logs.slice(0, 80);
      renderLogs();
    }

    function renderLogs() {
      logList.innerHTML = state.logs.map(item => (
        `<div class="log-item"><time>${item.t}</time>${item.message}</div>`
      )).join("");
    }

    function nowDateTimeText() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function getStepHotspots(step) {
      return step.hotspots || hotspotPresets[step.id] || [];
    }

    function getImageViewportRect() {
      const stageW = stepImage.clientWidth || stepImage.parentElement.clientWidth || 0;
      const stageH = stepImage.clientHeight || stepImage.parentElement.clientHeight || 0;
      let imgW = stepImage.naturalWidth || 0;
      let imgH = stepImage.naturalHeight || 0;
      if (!imgW || !imgH) {
        imgW = stageW || 1;
        imgH = stageH || 1;
      }
      const scale = Math.min(stageW / imgW, stageH / imgH) || 1;
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const offsetX = (stageW - drawW) / 2;
      const offsetY = (stageH - drawH) / 2;
      return { offsetX, offsetY, drawW, drawH };
    }

    function isPixelRect(rect) {
      return rect.unit === "px" || rect.coordSpace === "image";
    }

    function toViewportRect(rect, viewport) {
      if (isPixelRect(rect)) {
        const baseW = Number(rect.baseWidth) || stepImage.naturalWidth || 1024;
        const baseH = Number(rect.baseHeight) || stepImage.naturalHeight || 600;
        const x = Math.max(0, Number(rect.x) || 0);
        const y = Math.max(0, Number(rect.y) || 0);
        const w = Math.max(4, Number(rect.w) || 10);
        const h = Math.max(4, Number(rect.h) || 8);
        return {
          left: viewport.offsetX + (x / baseW) * viewport.drawW,
          top: viewport.offsetY + (y / baseH) * viewport.drawH,
          width: (w / baseW) * viewport.drawW,
          height: (h / baseH) * viewport.drawH
        };
      }
      const x = Math.max(0, Math.min(100, Number(rect.x) || 0));
      const y = Math.max(0, Math.min(100, Number(rect.y) || 0));
      const w = Math.max(4, Math.min(100, Number(rect.w) || 10));
      const h = Math.max(4, Math.min(100, Number(rect.h) || 8));
      return {
        left: viewport.offsetX + (x / 100) * viewport.drawW,
        top: viewport.offsetY + (y / 100) * viewport.drawH,
        width: (w / 100) * viewport.drawW,
        height: (h / 100) * viewport.drawH
      };
    }

    function getHotspotId(step, index) {
      return `${step.id}:${index}`;
    }

    function syncFieldInputValue(key, value) {
      const fieldEl = operationFields.querySelector(`[data-key="${key}"]`);
      if (!fieldEl) return;
      if (String(fieldEl.value ?? "") !== String(value ?? "")) {
        fieldEl.value = value ?? "";
      }
    }

    function isHotspotActive(step, spot, index) {
      if (spot.key && Object.prototype.hasOwnProperty.call(spot, "value")) {
        return String(state.form[spot.key] ?? "") === String(spot.value ?? "");
      }
      return state.ui.activeHotspotId === getHotspotId(step, index);
    }

    function cycleValue(key, values) {
      const current = String(state.form[key] ?? "");
      const idx = values.indexOf(current);
      const next = values[(idx + 1) % values.length];
      state.form[key] = next;
      return next;
    }

    function applyHotspotAction(step, spot) {
      let touched = false;
      if (spot.key && Object.prototype.hasOwnProperty.call(spot, "value")) {
        state.form[spot.key] = spot.value;
        syncFieldInputValue(spot.key, spot.value);
        touched = true;
      }
      if (spot.set) {
        Object.entries(spot.set).forEach(([key, value]) => {
          state.form[key] = value === "@now" ? nowDateTimeText() : value;
          syncFieldInputValue(key, state.form[key]);
          touched = true;
        });
      }
      if (spot.cycle && Array.isArray(spot.cycle.values) && spot.cycle.values.length > 0) {
        const next = cycleValue(spot.cycle.key, spot.cycle.values);
        syncFieldInputValue(spot.cycle.key, next);
        addLog(`已切换：${spot.cycle.key} = ${next}`);
        touched = true;
      }
      if (spot.log) addLog(spot.log);
      if (spot.run) {
        if (!validateStep(step)) {
          render();
          return;
        }
        state.done[step.id] = true;
        addLog(`已执行：${step.title}（通过图中点位）`);
      } else if (touched) {
        addLog(`已通过界面点位更新：${step.title}`);
      }
      if (spot.prev && state.current > 0) {
        state.current -= 1;
        state.ui.activeHotspotId = "";
      }
      if (spot.next && state.current < steps.length - 1) {
        state.current += 1;
        state.ui.activeHotspotId = "";
      }
      render();
    }

    function renderHotspots(step) {
      const hotspots = getStepHotspots(step);
      if (!hotspots.length) {
        hotspotLayer.innerHTML = "";
        return;
      }
      hotspotLayer.innerHTML = "";
      const viewport = getImageViewportRect();
      hotspots.forEach((spot, index) => {
        const rect = toViewportRect(spot, viewport);

        if (spot.kind === "input" && spot.key) {
          const input = document.createElement("input");
          input.type = "text";
          input.className = "hotspot-input";
          input.dataset.hotspotIndex = String(index);
          input.style.left = `${rect.left}px`;
          input.style.top = `${rect.top}px`;
          input.style.width = `${rect.width}px`;
          input.style.height = `${rect.height}px`;
          input.placeholder = spot.placeholder || spot.label || "";
          input.value = state.form[spot.key] ?? "";
          input.addEventListener("focus", () => {
            state.ui.activeHotspotId = getHotspotId(step, index);
            input.classList.add("active");
          });
          input.addEventListener("blur", () => {
            input.classList.remove("active");
          });
          input.addEventListener("input", (e) => {
            state.form[spot.key] = e.target.value;
            syncFieldInputValue(spot.key, e.target.value);
            renderSummary();
          });
          hotspotLayer.appendChild(input);
          return;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hotspot hotspot-btn";
        if (isHotspotActive(step, spot, index)) btn.classList.add("active");
        btn.dataset.hotspotIndex = String(index);
        btn.style.left = `${rect.left}px`;
        btn.style.top = `${rect.top}px`;
        btn.style.width = `${rect.width}px`;
        btn.style.height = `${rect.height}px`;
        btn.title = spot.label || "交互点";
        btn.textContent = "";
        btn.setAttribute("aria-label", spot.label || "交互点");
        btn.addEventListener("click", () => {
          state.ui.activeHotspotId = getHotspotId(step, index);
          applyHotspotAction(step, spot);
        });
        hotspotLayer.appendChild(btn);
      });
    }

    function setCurrent(index) {
      state.current = Math.max(0, Math.min(steps.length - 1, index));
      state.ui.activeHotspotId = "";
      render();
    }

    function renderStepList() {
      stepList.innerHTML = steps.map((step, idx) => {
        const done = state.done[step.id];
        const active = idx === state.current;
        return `
          <div class="step-item ${active ? "active" : ""} ${done ? "done" : ""}" data-index="${idx}">
            <span class="num">${done ? "✓" : idx + 1}</span>
            <div class="step-main">
              <strong>${step.title}</strong>
              <span>${step.phase}</span>
            </div>
          </div>
        `;
      }).join("");
      stepList.querySelectorAll(".step-item").forEach(el => {
        el.addEventListener("click", () => setCurrent(Number(el.dataset.index)));
      });
    }

    function renderOperationFields(step) {
      if (!step.fields || step.fields.length === 0) {
        operationFields.innerHTML = `<div class="hint" style="margin:0;color:#9fb8ea;">本步无必填输入，点击“执行本步操作”即可继续。</div>`;
        return;
      }
      operationFields.innerHTML = step.fields.map(field => {
        const value = state.form[field.key] ?? "";
        if (field.type === "select") {
          return `
            <label class="field">
              <span>${field.label}</span>
              <select data-key="${field.key}">
                ${field.options.map(opt => `<option value="${opt}" ${opt === value ? "selected" : ""}>${opt}</option>`).join("")}
              </select>
            </label>
          `;
        }
        return `
          <label class="field">
            <span>${field.label}</span>
            <input data-key="${field.key}" type="${field.type}" value="${value}" placeholder="${field.placeholder || ""}" />
          </label>
        `;
      }).join("");
      operationFields.querySelectorAll("[data-key]").forEach(el => {
        el.addEventListener("input", e => {
          state.form[e.target.dataset.key] = e.target.value;
          renderSummary();
          renderHotspots(step);
        });
        el.addEventListener("change", e => {
          state.form[e.target.dataset.key] = e.target.value;
          renderSummary();
          renderHotspots(step);
        });
      });
    }

    function validateStep(step) {
      if (!step.fields || step.fields.length === 0) return true;
      const empty = step.fields.find(field => {
        const v = String(state.form[field.key] ?? "").trim();
        return v.length === 0;
      });
      if (empty) {
        addLog(`步骤“${step.title}”未完成：${empty.label} 为空`);
        alert(`请先填写：${empty.label}`);
        return false;
      }
      return true;
    }

    function runStep() {
      const step = steps[state.current];
      if (!validateStep(step)) return;
      state.done[step.id] = true;
      addLog(`已执行：${step.title}`);
      render();
    }

    function nextStep() {
      if (state.current < steps.length - 1) setCurrent(state.current + 1);
    }

    function prevStep() {
      if (state.current > 0) setCurrent(state.current - 1);
    }

    function renderSummary() {
      const cards = [
        {
          title: "操作者信息",
          rows: [
            `手术时间：${state.form.surgeryTime || "-"}`,
            `医生姓名：${state.form.doctorName || "-"}`,
            `注意事项：${state.form.note || "-"}`
          ]
        },
        {
          title: "患者信息",
          rows: [
            `患者ID：${state.form.patientId || "-"}`,
            `姓名/年龄：${state.form.patientName || "-"} / ${state.form.patientAge || "-"}`
          ]
        },
        {
          title: "目标消融区",
          rows: [
            `损毁区(L/W/H)：${state.form.lesionL}/${state.form.lesionW}/${state.form.lesionH} cm`,
            `目标区(L/W/H)：${state.form.targetL}/${state.form.targetW}/${state.form.targetH} cm`,
            `边缘：${state.form.margin} cm`
          ]
        },
        {
          title: "关键参数",
          rows: [
            `脉宽/场强：${state.form.pulseWidth} us / ${state.form.fieldStrength} V/cm`,
            `数量/PPM：${state.form.count} / ${state.form.ppmSet}`,
            `间距/电压：${state.form.spacing} cm / ${state.form.voltageSet} V`
          ]
        }
      ];
      summaryGrid.innerHTML = cards.map(card => `
        <div class="summary-card">
          <strong>${card.title}</strong>
          <div>${card.rows.join("<br/>")}</div>
        </div>
      `).join("");
    }

    function render() {
      const step = steps[state.current];
      viewerTitle.textContent = `${state.current + 1}. ${step.title}`;
      viewerDesc.textContent = step.desc;
      phaseTag.textContent = step.phase;
      stepImage.src = step.image;
      opGuide.textContent = step.guide;

      progressText.textContent = `${state.current + 1} / ${steps.length}`;
      progressFill.style.width = `${((state.current + 1) / steps.length) * 100}%`;

      document.getElementById("prevBtn").disabled = state.current === 0;
      document.getElementById("nextBtn").disabled = state.current === steps.length - 1;

      renderOperationFields(step);
      renderHotspots(step);
      renderStepList();
      renderSummary();
    }

    function stopAuto() {
      if (state.autoTimer) {
        clearInterval(state.autoTimer);
        state.autoTimer = null;
      }
      document.getElementById("autoBtn").textContent = "自动演示";
    }

    function startAuto() {
      if (state.autoTimer) {
        stopAuto();
        return;
      }
      document.getElementById("autoBtn").textContent = "停止演示";
      state.autoTimer = setInterval(() => {
        const step = steps[state.current];
        if (!state.done[step.id] && validateStep(step)) {
          state.done[step.id] = true;
          addLog(`自动执行：${step.title}`);
        }
        if (state.current < steps.length - 1) {
          setCurrent(state.current + 1);
        } else {
          addLog("自动演示完成");
          stopAuto();
        }
      }, 2400);
    }

    function resetAll() {
      stopAuto();
      state.current = 0;
      state.done = {};
      state.form = { ...defaultForm };
      state.logs = [];
      addLog("已重置演示流程");
      render();
    }

    document.getElementById("doStepBtn").addEventListener("click", runStep);
    document.getElementById("nextBtn").addEventListener("click", nextStep);
    document.getElementById("prevBtn").addEventListener("click", prevStep);
    document.getElementById("autoBtn").addEventListener("click", startAuto);
    document.getElementById("resetBtn").addEventListener("click", resetAll);
    stepImage.addEventListener("load", () => {
      const step = steps[state.current];
      renderHotspots(step);
    });
    window.addEventListener("resize", () => {
      const step = steps[state.current];
      renderHotspots(step);
    });

    addLog("演示工具已加载");
    render();
  
