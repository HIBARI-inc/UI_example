# -*- coding: utf-8 -*-
"""
powder_dashboard.py
  - CSVテンプレート作成
  - ダミーデータ作成（任意）
  - 指定期間で集計し、棒グラフを出力（横軸=サンプル名、縦軸=指標）
"""

import argparse
import os
import sys
from datetime import timedelta
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import rcParams

# ===== 日本語フォント（Mac想定）=====
rcParams["font.family"] = ["Hiragino Sans", "AppleGothic", "Noto Sans CJK JP", "IPAexGothic", "DejaVu Sans"]
rcParams["axes.unicode_minus"] = False

COLUMNS = [
    "測定日",            # 例: 2025-03-01（YYYY-MM-DD）
    "製番",              # 例: H-20250301-01
    "サンプル名",        # 例: 試料A
    "流動性指数",        # 数値
    "噴流性指数",        # 数値
    "安息角[deg]",      # 数値（度）
    "かさ密度[g/cc]",   # 数値（g/cm^3）
    "圧縮度[%]"         # 数値（%）
]

def write_template(path: str):
    pd.DataFrame(columns=COLUMNS).to_csv(path, index=False, encoding="utf-8-sig")
    print(f"[OK] テンプレートを書き出しました: {path}")

def write_demo(path: str, years: int = 4):
    """ダミーデータ（必要なければ使わない）"""
    rng = pd.date_range(pd.Timestamp.today().normalize() - pd.DateOffset(years=years, months=2),
                        periods=28, freq="60D")
    samples = ["試料A", "試料B", "試料C", "試料D"]
    rows = []
    rs = np.random.RandomState(7)
    for d in rng:
        for s in samples:
            rows.append({
                "測定日": d.date().isoformat(),
                "製番": f"H-{d.strftime('%Y%m%d')}-{samples.index(s)+1:02d}",
                "サンプル名": s,
                "流動性指数": float(np.clip(rs.normal(60, 12), 20, 95)),
                "噴流性指数": float(np.clip(rs.normal(55, 10), 15, 95)),
                "安息角[deg]": float(np.clip(rs.normal(33, 3), 20, 50)),
                "かさ密度[g/cc]": float(np.round(np.clip(rs.normal(0.55, 0.08), 0.3, 0.9), 3)),
                "圧縮度[%]": float(np.clip(rs.normal(16, 4), 5, 35)),
            })
    df = pd.DataFrame(rows, columns=COLUMNS)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    print(f"[OK] ダミーデータを書き出しました: {path}  (行数: {len(df)})")

def load_and_filter(csv_path: str, start_ym: str, end_ym: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    # 必須列チェック
    missing = [c for c in COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV に必要な列がありません: {missing}")

    df["測定日"] = pd.to_datetime(df["測定日"])
    start = pd.to_datetime(start_ym + "-01")
    end = (pd.to_datetime(end_ym + "-01") + pd.offsets.MonthEnd(0)).normalize() + timedelta(seconds=86399)
    df = df[(df["測定日"] >= start) & (df["測定日"] <= end)].copy()

    # 文字列→数値（念のため）
    for col in ["流動性指数", "噴流性指数", "安息角[deg]", "かさ密度[g/cc]", "圧縮度[%]"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # 期間は max 5 年想定（厳密制限はしないが参考）
    return df

def make_bar_chart(df: pd.DataFrame, y_col: str, title: str, out_png: str):
    """期間内の平均値で棒グラフ（横軸=サンプル名）"""
    g = df.groupby("サンプル名", as_index=True)[y_col].mean().sort_values(ascending=False)
    plt.figure(figsize=(8, 5))
    g.plot(kind="bar")  # ← 色は指定しない
    plt.title(title)
    plt.xlabel("サンプル名")
    plt.ylabel(y_col)
    plt.tight_layout()
    plt.savefig(out_png, dpi=180)
    plt.close()
    print(f"[OK] 画像を書き出しました: {out_png}")

def run_make_graphs(csv_path: str, out_dir: str, start_ym: str, end_ym: str):
    os.makedirs(out_dir, exist_ok=True)
    df = load_and_filter(csv_path, start_ym, end_ym)
    if df.empty:
        print("[WARN] 指定期間にデータがありません。")
        return

    charts = [
        ("流動性指数",       "期間内の平均 流動性指数（横軸=サンプル名）",  "bar_flowability_index.png"),
        ("噴流性指数",       "期間内の平均 噴流性指数（横軸=サンプル名）",  "bar_jetting_index.png"),
        ("安息角[deg]",     "期間内の平均 安息角（横軸=サンプル名）",      "bar_angle_of_repose.png"),
        ("かさ密度[g/cc]",  "期間内の平均 かさ密度（横軸=サンプル名）",    "bar_bulk_density.png"),
        ("圧縮度[%]",       "期間内の平均 圧縮度（横軸=サンプル名）",      "bar_compressibility.png"),
    ]
    for col, title, filename in charts:
        make_bar_chart(df, col, title, os.path.join(out_dir, filename))

    # 期間内データをそのまま出力（表として共有したいとき用）
    out_csv = os.path.join(out_dir, "filtered_data.csv")
    df.sort_values(["測定日", "サンプル名"], ascending=[False, True]).to_csv(out_csv, index=False, encoding="utf-8-sig")
    print(f"[OK] 期間内データを書き出しました: {out_csv}  (行数: {len(df)})")

def main():
    p = argparse.ArgumentParser(description="粉体物性情報ダッシュボード：CSV作成とグラフ出力")
    sub = p.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("make-template", help="CSVテンプレートを出力")
    t.add_argument("--out", default="powder_properties_template.csv")

    d = sub.add_parser("make-demo", help="ダミーデータCSVを出力（テスト用）")
    d.add_argument("--out", default="powder_properties.csv")
    d.add_argument("--years", type=int, default=4)

    g = sub.add_parser("make-graphs", help="CSVから期間集計して棒グラフを出力")
    g.add_argument("--csv", required=True, help="入力CSVパス")
    g.add_argument("--outdir", default="powder_dashboard_out")
    g.add_argument("--start", default="2023-01", help="開始（YYYY-MM）")
    g.add_argument("--end",   default="2025-12", help="終了（YYYY-MM）")

    args = p.parse_args()

    if args.cmd == "make-template":
        write_template(args.out)
    elif args.cmd == "make-demo":
        write_demo(args.out, years=args.years)
    elif args.cmd == "make-graphs":
        run_make_graphs(args.csv, args.outdir, args.start, args.end)
    else:
        p.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
