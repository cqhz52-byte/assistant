CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'engineer',
  department VARCHAR(120) NOT NULL DEFAULT '临床支持部',
  region VARCHAR(64) NOT NULL DEFAULT '华东',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(64) NOT NULL,
  level VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) PRIMARY KEY,
  product_line_id VARCHAR(64) NOT NULL,
  product_line_name VARCHAR(255) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL,
  sn_prefix VARCHAR(32) NOT NULL,
  parameter_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_consumables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinical_cases (
  id VARCHAR(64) PRIMARY KEY,
  case_date DATE NOT NULL,
  hospital_id VARCHAR(64) NOT NULL REFERENCES hospitals(id),
  hospital_name VARCHAR(255) NOT NULL,
  doctor_name VARCHAR(120) NOT NULL,
  engineer_id UUID NOT NULL REFERENCES users(id),
  engineer_name VARCHAR(120) NOT NULL,
  product_line_id VARCHAR(64) NOT NULL,
  product_line_name VARCHAR(255) NOT NULL,
  device_id VARCHAR(64) NOT NULL REFERENCES devices(id),
  device_name VARCHAR(255) NOT NULL,
  surgery_type VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  abnormal BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(64) NOT NULL UNIQUE REFERENCES clinical_cases(id) ON DELETE CASCADE,
  device_id VARCHAR(64) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT NOT NULL DEFAULT '',
  complications TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(64) NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  batch_no VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(64) NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(512) NOT NULL DEFAULT '',
  file_type VARCHAR(120) NOT NULL DEFAULT 'image/*',
  file_size VARCHAR(64) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO hospitals (id, name, region, level)
VALUES
  ('hsp-shzy', '上海中医药大学附属龙华医院', '华东', '三甲'),
  ('hsp-bjxt', '北京协和医院', '华北', '三甲'),
  ('hsp-gzfy', '广州医科大学附属第一医院', '华南', '三甲'),
  ('hsp-cqsw', '重庆市肿瘤医院', '西南', '三甲'),
  ('hsp-whzx', '武汉大学中南医院', '华中', '三甲'),
  ('hsp-xajd', '西安交通大学第一附属医院', '西北', '三甲')
ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, product_line_id, product_line_name, model_name, category, sn_prefix, parameter_schema, default_consumables)
VALUES
  (
    'dev-ctnav-pro',
    'robot',
    'CT引导下穿刺导航机器人',
    'CT-Nav Pro 导航机器人',
    '穿刺导航机器人',
    'CTN',
    '[{"key":"plannedDepth","label":"计划进针深度","unit":"mm"},{"key":"needleAngle","label":"进针角度","unit":"°"},{"key":"scanCount","label":"扫描次数","unit":"次"}]'::jsonb,
    '["定位针","穿刺针","导向架"]'::jsonb
  ),
  (
    'dev-ire-2000',
    'ire',
    'IRE陡脉冲治疗系统',
    'IRE-2000 陡脉冲治疗系统',
    'IRE',
    'IRE',
    '[{"key":"outputPower","label":"输出功率","unit":"W"},{"key":"pulseCount","label":"脉冲次数","unit":"次"},{"key":"duration","label":"作用时长","unit":"min"}]'::jsonb,
    '["IRE 电极针","连接线","一次性无菌罩"]'::jsonb
  ),
  (
    'dev-rf-90',
    'rf-ablation',
    '射频消融治疗系统',
    'RF-90 射频消融主机',
    '射频消融',
    'RF',
    '[{"key":"outputPower","label":"输出功率","unit":"W"},{"key":"targetTemp","label":"靶温","unit":"°C"},{"key":"duration","label":"维持时长","unit":"s"}]'::jsonb,
    '["射频针","对极板","连接导线"]'::jsonb
  ),
  (
    'dev-biopsy-core',
    'biopsy',
    '活检穿刺系统',
    'CoreBx 活检穿刺系统',
    '活检穿刺',
    'CBX',
    '[{"key":"needleGauge","label":"针径规格","unit":"G"},{"key":"sampleCount","label":"取样次数","unit":"次"},{"key":"depth","label":"穿刺深度","unit":"mm"}]'::jsonb,
    '["活检针","同轴针","标本盒"]'::jsonb
  ),
  (
    'dev-vein-close',
    'vein-rf',
    '静脉射频腔内闭合系统',
    'VeinClose 静脉闭合系统',
    '静脉射频',
    'VCL',
    '[{"key":"segmentLength","label":"闭合段长","unit":"cm"},{"key":"cycleCount","label":"闭合周期","unit":"次"},{"key":"targetTemp","label":"工作温度","unit":"°C"}]'::jsonb,
    '["静脉闭合导管","鞘管","耦合剂"]'::jsonb
  ),
  (
    'dev-es-300',
    'electrosurgical',
    '高频电刀系统',
    'ES-300 高频电刀',
    '高频电刀',
    'ES',
    '[{"key":"cutPower","label":"切割功率","unit":"W"},{"key":"coagPower","label":"凝血功率","unit":"W"},{"key":"modeCount","label":"启用模式","unit":"种"}]'::jsonb,
    '["电刀笔","负极板","脚踏开关"]'::jsonb
  ),
  (
    'dev-neuro-therm',
    'neuro',
    '神经热凝治疗系统',
    'NeuroTherm 神经热凝系统',
    '神经热凝',
    'NT',
    '[{"key":"targetTemp","label":"靶温","unit":"°C"},{"key":"duration","label":"热凝时长","unit":"s"},{"key":"impedance","label":"阻抗","unit":"Ω"}]'::jsonb,
    '["热凝针","刺激电极","定位贴片"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
