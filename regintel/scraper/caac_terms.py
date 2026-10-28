"""Deterministic Chinese→English rendering for CAAC regulatory titles.

WHY A GLOSSARY AND NOT A MODEL
CAAC publishes in Chinese, and subscribers need to read the feed in English.
Translation is inference, and the ingestion path must stay free of models — a
fluent-sounding mistranslation of a regulatory title is exactly the failure
HANDOVER.md warns about, because it looks right whether or not it is.

CAAC titles are highly formulaic: they are compounds of a small, stable
regulatory vocabulary ("运输类飞机" + "合格审定" + "程序"). A longest-match
glossary therefore renders most of them accurately, and — unlike a model — it
is auditable, reversible, and produces the same output every run, so the
content hash stays stable.

WHAT THIS IS NOT
It is not fluent translation and does not pretend to be. Untranslated fragments
are left as-is rather than guessed at, and `render()` reports how much of the
string it actually recognised so the caller can be honest about coverage.

THE ORIGINAL IS ALWAYS AUTHORITATIVE. Callers must keep the Chinese title, and
present the English as an aid to it. Never the other way round.
"""

from __future__ import annotations

import re

# Longest-first matching matters: 民用航空器 must win over 民用航空, and
# 补充型号合格证 over 型号合格证, or compounds render as nonsense.
GLOSSARY: dict[str, str] = {
    # --- instruments and document classes ---
    "中华人民共和国": "People's Republic of China",
    "主席令": "Presidential Order",
    "国务院": "State Council",
    "民用航空法": "Civil Aviation Law",
    "暂行条例": "Interim Regulations",
    "条例": "Regulations",
    "实施细则": "Implementing Rules",
    "管理规定": "Administrative Provisions",
    "管理办法": "Administrative Measures",
    "规定": "Provisions",
    "规则": "Rules",
    "办法": "Measures",
    "程序": "Procedures",
    "指南": "Guidance",
    "咨询通告": "Advisory Circular",
    "管理程序": "Management Procedures",
    "适航指令": "Airworthiness Directive",
    "规范性文件": "Normative Document",
    "标准": "Standard",
    "要求": "Requirements",
    "决定": "Decision",
    "通知": "Notice",
    "公告": "Announcement",
    "通告": "Circular",
    "征求意见稿": "Draft for Comment",
    "修订": "Revision",
    "修改": "Amendment",
    "废止": "Repeal",

    # --- domains ---
    "民用航空器": "Civil Aircraft",
    "民用航空": "Civil Aviation",
    "通用航空": "General Aviation",
    "公共航空运输": "Public Air Transport",
    "无人驾驶航空器": "Unmanned Aircraft",
    "运输类飞机": "Transport Category Aeroplanes",
    "运输类旋翼航空器": "Transport Category Rotorcraft",
    "小型航空器": "Small Aircraft",
    "航空器": "Aircraft",
    "飞机": "Aeroplane",
    "直升机": "Helicopter",
    "发动机": "Engine",
    "螺旋桨": "Propeller",
    "机场": "Aerodrome",
    "空中交通": "Air Traffic",
    "空中交通管制": "Air Traffic Control",
    "空管": "Air Traffic Management",
    "适航": "Airworthiness",
    "持续适航": "Continuing Airworthiness",
    "维修": "Maintenance",
    "维修单位": "Maintenance Organisation",
    "运行": "Operations",
    "全天候运行": "All-Weather Operations",
    "飞行": "Flight",
    "飞行标准": "Flight Standards",
    "人员": "Personnel",
    "机组": "Crew",
    "驾驶员": "Pilot",
    "签派员": "Dispatcher",
    "安全": "Safety",
    "安全管理体系": "Safety Management System",
    "危险品": "Dangerous Goods",
    "航空卫生": "Aviation Medicine",
    "航空安保": "Aviation Security",
    "经营": "Operating",
    "许可": "Licensing",

    # --- certification vocabulary ---
    "补充型号合格证": "Supplemental Type Certificate",
    "型号合格证": "Type Certificate",
    "改装设计批准书": "Modification Design Approval",
    "生产许可证": "Production Certificate",
    "适航证": "Certificate of Airworthiness",
    "合格审定": "Certification",
    "合格证": "Certificate",
    "批准": "Approval",
    "审定": "Certification",
    "登记": "Registration",
    "国籍登记": "Nationality Registration",

    # --- misc frequently seen ---
    "无线电通话用语": "Radiotelephony Phraseology",
    "干扰": "Interference",
    "处置": "Handling",
    "统计": "Statistics",
    "主要生产指标": "Principal Operating Indicators",
    "政策法规司": "Department of Policy and Regulation",
    "飞行标准司": "Flight Standards Department",
    "适航审定司": "Airworthiness Certification Department",
    "运输司": "Transport Department",
    "机场司": "Airport Department",
    "空管办": "ATM Office",
    "有效": "In force",
    "失效": "Not in force",
    "已废止": "Repealed",
    "部分有效": "Partially in force",
    "起施行": "effective from",
    "施行": "effective",

    # --- connectives and qualifiers ---
    # Without these, titles render as English studded with stray characters
    # ("Amendment 和 Repeal 部分行政法规的 Decision"), which reads as breakage.
    "关于": "on",
    "部分": "certain",
    "行政法规": "administrative regulations",
    "管理": "Management",
    "和": "and",
    "及": "and",
    "与": "and",
    "的": "",
    "等": "etc.",
    "版": "edition",
    "第": "No.",
    "号": "",
    "试行": "Trial",
    "若干": "several",
    "问题": "matters",
    "有关": "relevant",

    # --- legislature and instrument sources ---
    "全国人民代表大会常务委员会": "NPC Standing Committee",
    "全国人民代表大会": "National People's Congress",
    "道路交通安全法": "Road Traffic Safety Law",
    "法律": "Laws",
    "八部": "eight",
    "令": "Order",
    "国令": "State Council Order",

    # --- added from live titles; see untranslated_terms() ---
    "批准放行证书": "Authorised Release Certificate",
    "放行证书": "Release Certificate",
    "签发": "Issuance",
    "民用": "Civil",
    "实名": "Real-name",
    "运营": "Operation",
    "机载": "Airborne",
    "气象雷达": "Weather Radar",
    "设备": "Equipment",
    "交通运输部": "Ministry of Transport",
    "维修许可": "Maintenance Approval",
    "技术标准规定": "Technical Standard Order",
    "国籍": "Nationality",
    "证书": "Certificate",
    "监督": "Oversight",
    "检查": "Inspection",
    "培训": "Training",
    "训练": "Training",
    "手册": "Manual",
    "大纲": "Syllabus",
    "评估": "Assessment",
    "报告": "Report",
    "记录": "Records",
    "系统": "System",
    "设计": "Design",
    "制造": "Manufacture",
    "使用": "Use",
    "航线": "Route",
    "航空公司": "Airline",
    "运输": "Transport",
    "旅客": "Passenger",
    "货物": "Cargo",

    # --- second pass, driven by untranslated_terms() over live titles ---
    "航空": "Aviation",
    "技术": "Technical",
    "企业": "Enterprise",
    "正常类旋翼航空器": "Normal Category Rotorcraft",
    "正常类": "Normal Category",
    "旋翼航空器": "Rotorcraft",
    "运输类": "Transport Category",
    "大型": "Large",
    "小型": "Small",
    "轻型": "Light",
    "通用": "General",
    "不载人": "Uncrewed",
    "载人": "Crewed",
    "液压油": "Hydraulic Fluid",
    "抗燃磷酸酯": "Fire-resistant Phosphate Ester",
    "性能": "Performance",
    "测试方法": "Test Method",
    "试验方法": "Test Method",
    "型号": "Type",
    "型": "Type",
    "类": "Category",
    "分类": "Classification",
    "定义": "Definitions",
    "术语": "Terminology",
    "规范": "Specification",
    "导则": "Guidelines",
    "细则": "Detailed Rules",
    "实施": "Implementation",
    "组织": "Organisation",
    "单位": "Organisation",
    "机构": "Body",
    "资格": "Qualification",
    "能力": "Capability",
    "质量": "Quality",
    "地面": "Ground",
    "客舱": "Cabin",
    "燃油": "Fuel",
    "润滑油": "Lubricating Oil",
    "材料": "Materials",
    "部件": "Components",
    "零部件": "Parts and Components",

    # --- third pass ---
    "操控员": "Remote Pilot",
    "专用条件": "Special Condition",
    "动力提升": "Powered-lift",
    "规划建设": "Planning and Construction",
    "建设": "Construction",
    "规划": "Planning",
    "高原": "High-altitude",
    "水上": "Water",
    "功率": "Power",
    "状态": "Condition",
    "分钟": "minute",
    "站": "Station",
    "操控": "Control",
    "空域": "Airspace",
    "活动": "Activities",
    "应急": "Emergency",
    "责任": "Liability",
    "总则": "General Provisions",
    "附则": "Supplementary Provisions",
    "罚则": "Penalties",
    "章": "Chapter",
    "条": "Article",
    "空中航行": "Air Navigation",
    "搜寻援救和事故调查": "Search and Rescue and Accident Investigation",
    "事故调查": "Accident Investigation",
    "搜寻援救": "Search and Rescue",
    "保卫": "Security",
    "涉外关系": "Foreign Relations",
    "管": "Management",
    "月": "-",
    "日": "",
}

_ORDERED = sorted(GLOSSARY, key=len, reverse=True)
_HAN = re.compile(r"[一-鿿]")


def render(text: str) -> tuple[str, float]:
    """Render a Chinese title into English terms.

    Returns (rendered, coverage) where coverage is the fraction of Han
    characters the glossary recognised. A caller can use it to decide whether
    the rendering is worth showing at all.
    """
    if not text:
        return "", 0.0

    # Dates first: 2026年7月1日 -> 2026-07-01. Mapping 年/月/日 individually
    # produced "2026 - 7 - 1", which is neither Chinese nor a usable date.
    text = re.sub(r"(\d{4})年(\d{1,2})月(\d{1,2})日",
                  lambda m: f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}", text)
    text = re.sub(r"(\d{4})年(\d{1,2})月",
                  lambda m: f"{m.group(1)}-{int(m.group(2)):02d}", text)
    text = re.sub(r"(\d{4})年", r"\1", text)

    total_han = len(_HAN.findall(text))
    out = text
    matched_han = 0
    for term in _ORDERED:
        if term in out:
            hits = out.count(term)
            matched_han += hits * len(_HAN.findall(term))
            out = out.replace(term, f" {GLOSSARY[term]} ")

    out = re.sub(r"\s+", " ", out).strip()
    out = re.sub(r"\s+([,)）])", r"\1", out)
    out = re.sub(r"([（(])\s+", r"\1", out)
    coverage = (matched_han / total_han) if total_han else 1.0
    return out, min(coverage, 1.0)


def untranslated_terms(text: str) -> list[str]:
    """Han runs the glossary did not recognise.

    Maintenance aid: run this over a batch of live titles to see exactly which
    terms to add next, rather than guessing at the vocabulary.
    """
    out = text
    for term in _ORDERED:
        out = out.replace(term, " ")
    return [r for r in re.findall(r"[\u4e00-\u9fff]+", out) if r]


def bilingual(chinese: str, min_coverage: float = 0.45) -> str:
    """English rendering first, Chinese original second.

    Below `min_coverage` the glossary has not recognised enough of the title
    for the English to be meaningful, so the Chinese is returned alone rather
    than fronting a half-rendered string that reads like a bad translation.
    """
    english, coverage = render(chinese)
    if coverage < min_coverage or not english.strip():
        return chinese
    return f"{english} — {chinese}"
