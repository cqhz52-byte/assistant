from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
HOSPITALS_DIR = DATA_DIR / 'hospitals'
CURATED_OVERRIDES_PATH = DATA_DIR / 'hospital-curated-overrides.json'
WIKI_URL = 'https://zh.wikipedia.org/wiki/三级甲等医院'
USER_AGENT = 'Mozilla/5.0 CodexApp/1.0 (+https://openai.com)'

PROVINCE_CONFIG = {
    '北京市': {'slug': 'beijing', 'short': '北京'},
    '天津市': {'slug': 'tianjin', 'short': '天津'},
    '河北省': {'slug': 'hebei', 'short': '河北'},
    '山西省': {'slug': 'shanxi', 'short': '山西'},
    '内蒙古自治区': {'slug': 'inner-mongolia', 'short': '内蒙古'},
    '辽宁省': {'slug': 'liaoning', 'short': '辽宁'},
    '吉林省': {'slug': 'jilin', 'short': '吉林'},
    '黑龙江省': {'slug': 'heilongjiang', 'short': '黑龙江'},
    '上海市': {'slug': 'shanghai', 'short': '上海'},
    '江苏省': {'slug': 'jiangsu', 'short': '江苏'},
    '浙江省': {'slug': 'zhejiang', 'short': '浙江'},
    '安徽省': {'slug': 'anhui', 'short': '安徽'},
    '福建省': {'slug': 'fujian', 'short': '福建'},
    '江西省': {'slug': 'jiangxi', 'short': '江西'},
    '山东省': {'slug': 'shandong', 'short': '山东'},
    '河南省': {'slug': 'henan', 'short': '河南'},
    '湖北省': {'slug': 'hubei', 'short': '湖北'},
    '湖南省': {'slug': 'hunan', 'short': '湖南'},
    '广东省': {'slug': 'guangdong', 'short': '广东'},
    '广西壮族自治区': {'slug': 'guangxi', 'short': '广西'},
    '海南省': {'slug': 'hainan', 'short': '海南'},
    '重庆市': {'slug': 'chongqing', 'short': '重庆'},
    '四川省': {'slug': 'sichuan', 'short': '四川'},
    '贵州省': {'slug': 'guizhou', 'short': '贵州'},
    '云南省': {'slug': 'yunnan', 'short': '云南'},
    '西藏自治区': {'slug': 'tibet', 'short': '西藏'},
    '陕西省': {'slug': 'shaanxi', 'short': '陕西'},
    '甘肃省': {'slug': 'gansu', 'short': '甘肃'},
    '青海省': {'slug': 'qinghai', 'short': '青海'},
    '宁夏回族自治区': {'slug': 'ningxia', 'short': '宁夏'},
    '新疆维吾尔自治区': {'slug': 'xinjiang', 'short': '新疆'},
    '新疆生产建设兵团': {'slug': 'xinjiang-bingtuan', 'short': '新疆兵团'},
    '中国人民解放军': {'slug': 'pla', 'short': '解放军'},
}

REGION_CONFIG = {
    '华北 地区': '华北',
    '东北 地区': '东北',
    '华东 地区': '华东',
    '中南 地区': '中南',
    '西南 地区': '西南',
    '西北 地区': '西北',
    '中国人民解放军': '全国',
}

SPECIAL_SOURCE_PAGES = {
    '浙江省': 'https://zh.wikipedia.org/wiki/浙江省三级甲等医院列表',
}

FEATURED_HOSPITALS = {
    '中国医学科学院北京协和医院',
    '中日友好医院',
    '北京大学第一医院',
    '复旦大学附属中山医院',
    '复旦大学附属华山医院',
    '上海交通大学医学院附属瑞金医院',
    '浙江大学医学院附属第一医院',
    '中山大学附属第一医院',
    '四川大学华西医院',
    '华中科技大学同济医学院附属同济医院',
    '华中科技大学同济医学院附属协和医院',
    '中南大学湘雅医院',
    '空军军医大学西京医院',
    '中国医科大学附属第一医院',
    '山东大学齐鲁医院',
}

ALIASES_BY_NAME = {
    '中国医学科学院北京协和医院': ['北京协和医院', '北京协和'],
    '中日友好医院': ['中日医院'],
    '北京大学第一医院': ['北大医院', '北大一院'],
    '北京大学人民医院': ['北大人民医院'],
    '北京大学第三医院': ['北医三院'],
    '复旦大学附属中山医院': ['上海中山医院', '中山医院'],
    '复旦大学附属华山医院': ['上海华山医院', '华山医院'],
    '上海交通大学医学院附属瑞金医院': ['上海瑞金医院', '瑞金医院'],
    '浙江大学医学院附属第一医院': ['浙大一院'],
    '浙江大学医学院附属第二医院': ['浙大二院'],
    '中山大学附属第一医院': ['中山一院'],
    '中山大学孙逸仙纪念医院': ['中山二院', '孙逸仙纪念医院'],
    '四川大学华西医院': ['华西医院'],
    '四川大学华西第二医院': ['华西二院'],
    '华中科技大学同济医学院附属同济医院': ['武汉同济医院', '同济医院'],
    '华中科技大学同济医学院附属协和医院': ['武汉协和医院', '协和医院'],
    '中南大学湘雅医院': ['湘雅医院'],
    '中南大学湘雅二医院': ['湘雅二医院'],
    '中南大学湘雅三医院': ['湘雅三医院'],
    '空军军医大学西京医院': ['西京医院'],
    '中国医科大学附属第一医院': ['中国医大一院', '医大一院'],
    '山东大学齐鲁医院': ['齐鲁医院'],
}

DIRECT_CONTROLLED_CITIES = {'北京市', '天津市', '上海市', '重庆市'}


def load_curated_overrides() -> dict[str, dict]:
    if not CURATED_OVERRIDES_PATH.exists():
        return {}
    with CURATED_OVERRIDES_PATH.open('r', encoding='utf-8') as file:
        items = json.load(file)
    return {item['name']: item for item in items}


def fetch_wiki_page() -> str:
    response = requests.get(
        WIKI_URL,
        headers={'User-Agent': USER_AGENT},
        timeout=30,
    )
    response.raise_for_status()
    return response.text


def clean_heading(text: str) -> str:
    return text.replace('[ 编辑 ]', '').replace('[编辑]', '').split(' [', 1)[0].strip()


def strip_count_suffix(text: str) -> str:
    for marker in ('（', '('):
        position = text.rfind(marker)
        if position != -1:
            return text[:position].strip()
    return text.strip()


def normalize_city_name(name: str, province_full_name: str, province_short_name: str) -> str:
    if not name:
        return province_short_name if province_full_name in DIRECT_CONTROLLED_CITIES else ''

    cleaned = name.strip()
    for suffix in ('地区', '自治州', '盟', '市'):
        if cleaned.endswith(suffix):
            return cleaned[: -len(suffix)]
    return cleaned


def split_name_and_aliases(raw_name: str) -> tuple[str, list[str]]:
    clean_name = re.sub(r'\[.*?\]', '', raw_name).strip()
    aliases = [match.strip() for match in re.findall(r'[（(]([^()（）]+)[)）]', clean_name) if match.strip()]
    base_name = re.sub(r'\s*[（(][^()（）]+[)）]\s*', '', clean_name).strip()
    return base_name or clean_name, aliases


def dedupe_strings(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            result.append(cleaned)
            seen.add(cleaned)
    return result


def parse_hospitals(html: str) -> dict[str, list[dict]]:
    soup = BeautifulSoup(html, 'lxml')
    content = soup.select_one('#mw-content-text .mw-parser-output')
    if content is None:
        raise RuntimeError('Unable to locate wiki content container.')

    region_full_name = ''
    province_full_name = ''
    city_full_name = ''
    in_public_section = False
    grouped: dict[str, list[dict]] = defaultdict(list)

    for element in content.children:
        tag_name = getattr(element, 'name', None)
        if not tag_name:
            continue

        if tag_name == 'div' and 'mw-heading2' in (element.get('class') or []):
            heading = clean_heading(element.get_text(' ', strip=True))
            if '全国三级甲等医院列表' in heading and '公立医院' in heading:
                in_public_section = True
                region_full_name = ''
                province_full_name = ''
                city_full_name = ''
                continue
            if in_public_section:
                break

        if not in_public_section:
            continue

        if tag_name == 'div' and 'mw-heading3' in (element.get('class') or []):
            title = strip_count_suffix(clean_heading(element.get_text(' ', strip=True)))
            if title == '中国人民解放军':
                region_full_name = title
                province_full_name = title
                city_full_name = ''
                continue
            region_full_name = title
            province_full_name = ''
            city_full_name = ''
            continue

        if tag_name == 'div' and 'mw-heading4' in (element.get('class') or []):
            province_full_name = strip_count_suffix(clean_heading(element.get_text(' ', strip=True)))
            city_full_name = province_full_name if province_full_name in DIRECT_CONTROLLED_CITIES else ''
            continue

        if tag_name == 'div' and 'mw-heading5' in (element.get('class') or []):
            city_full_name = strip_count_suffix(clean_heading(element.get_text(' ', strip=True)))
            continue

        if tag_name != 'table' or 'wikitable' not in (element.get('class') or []):
            continue

        if province_full_name not in PROVINCE_CONFIG:
            continue

        for row in element.select('tr')[1:]:
            cells = row.select('td')
            if not cells:
                continue

            name, aliases = split_name_and_aliases(cells[0].get_text(' ', strip=True))
            grouped[province_full_name].append(
                {
                    'name': name,
                    'aliases': aliases,
                    'region': REGION_CONFIG.get(region_full_name, region_full_name.replace(' 地区', '')),
                    'provinceFullName': province_full_name,
                    'cityFullName': city_full_name,
                }
            )

    return grouped


def parse_special_source_page(page_url: str, province_full_name: str) -> list[dict]:
    response = requests.get(
        page_url,
        headers={'User-Agent': USER_AGENT},
        timeout=30,
    )
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'lxml')
    content = soup.select_one('#mw-content-text .mw-parser-output')
    if content is None:
        return []

    entries: list[dict] = []
    city_full_name = ''

    for element in content.children:
        tag_name = getattr(element, 'name', None)
        if not tag_name:
            continue

        if tag_name == 'div' and 'mw-heading2' in (element.get('class') or []):
            title = strip_count_suffix(clean_heading(element.get_text(' ', strip=True)))
            if title in {'注释', '參考資料', '参考资料', '外部連結', '外部链接'}:
                break
            city_full_name = title
            continue

        if tag_name != 'table' or 'wikitable' not in (element.get('class') or []):
            continue

        for row in element.select('tr')[1:]:
            cells = row.select('td')
            if not cells:
                continue

            name, aliases = split_name_and_aliases(cells[0].get_text(' ', strip=True))
            entries.append(
                {
                    'name': name,
                    'aliases': aliases,
                    'region': REGION_CONFIG['华东 地区'],
                    'provinceFullName': province_full_name,
                    'cityFullName': city_full_name,
                }
            )

    return entries


def build_database() -> tuple[list[dict], list[dict]]:
    curated_overrides = load_curated_overrides()
    grouped_raw_hospitals = parse_hospitals(fetch_wiki_page())

    for province_full_name, page_url in SPECIAL_SOURCE_PAGES.items():
        grouped_raw_hospitals[province_full_name] = parse_special_source_page(page_url, province_full_name)

    province_manifest: list[dict] = []
    all_hospitals: list[dict] = []

    HOSPITALS_DIR.mkdir(parents=True, exist_ok=True)

    for existing_file in HOSPITALS_DIR.glob('*.json'):
        existing_file.unlink()

    for province_full_name, config in PROVINCE_CONFIG.items():
        province_short_name = config['short']
        slug = config['slug']
        province_entries: list[dict] = []
        seen_names: set[str] = set()

        for item in grouped_raw_hospitals.get(province_full_name, []):
            if item['name'] in seen_names:
                continue
            seen_names.add(item['name'])

            override = curated_overrides.get(item['name'], {})
            aliases = dedupe_strings(
                item['aliases']
                + override.get('aliases', [])
                + ALIASES_BY_NAME.get(item['name'], [])
            )

            city_full_name = item['cityFullName']
            city_name = override.get(
                'city',
                normalize_city_name(city_full_name, province_full_name, province_short_name),
            )

            province_entries.append(
                {
                    'id': '',
                    'name': item['name'],
                    'province': override.get('province', province_short_name),
                    'provinceFullName': province_full_name,
                    'city': city_name,
                    'cityFullName': city_full_name,
                    'region': item['region'],
                    'level': '三级甲等',
                    'aliases': aliases,
                    'featured': bool(override.get('featured')) or item['name'] in FEATURED_HOSPITALS,
                }
            )

        province_entries.sort(key=lambda entry: (0 if entry['featured'] else 1, entry['name']))

        for index, entry in enumerate(province_entries, start=1):
            entry['id'] = f"hosp-{slug}-{index:03d}"

        province_path = HOSPITALS_DIR / f'{slug}.json'
        with province_path.open('w', encoding='utf-8') as file:
            json.dump(province_entries, file, ensure_ascii=False, indent=2)
            file.write('\n')

        province_manifest.append(
            {
                'slug': slug,
                'province': province_short_name,
                'provinceFullName': province_full_name,
                'region': province_entries[0]['region'] if province_entries else '',
                'count': len(province_entries),
            }
        )
        all_hospitals.extend(province_entries)

    manifest_path = HOSPITALS_DIR / 'manifest.json'
    with manifest_path.open('w', encoding='utf-8') as file:
        json.dump(sorted(province_manifest, key=lambda item: item['slug']), file, ensure_ascii=False, indent=2)
        file.write('\n')

    return all_hospitals, province_manifest


def main() -> None:
    all_hospitals, province_manifest = build_database()
    print(f'Generated {len(all_hospitals)} hospitals across {len(province_manifest)} province files.')


if __name__ == '__main__':
    main()
