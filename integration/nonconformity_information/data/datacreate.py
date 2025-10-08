import numpy as np
import matplotlib.pyplot as plt
from matplotlib import rcParams

rcParams['font.family'] = 'Hiragino Sans'

# ===== ダミーデータ作成 =====
periods = ["2024Q1", "2024Q2", "2024Q3", "2024Q4", "2025Q1"]
customers = ["A社", "B社", "C社", "D社"]
causes = ["設計", "製造", "検査", "材料"]
phenomena = ["不具合", "破損", "変形", "漏れ"]

rng = np.random.default_rng(123)

# ===== 1. 期間別 合計金額 =====
amounts = rng.integers(50, 200, size=len(periods))
plt.bar(periods, amounts)
plt.title("期間別 合計金額")
plt.ylabel("金額")
plt.tight_layout()
plt.savefig("amount-bar.png")
plt.close()

# ===== 2. 原因コード 棒・円 =====
cause_counts = rng.integers(10, 100, size=len(causes))
plt.bar(causes, cause_counts)
plt.title("原因コード 件数")
plt.ylabel("件数")
plt.tight_layout()
plt.savefig("cause-bar.png")
plt.close()

plt.pie(cause_counts, labels=causes, autopct="%.1f%%")
plt.title("原因コード 構成比")
plt.tight_layout()
plt.savefig("cause-pie.png")
plt.close()

# ===== 3. 現象コード 棒・円 =====
phen_counts = rng.integers(10, 100, size=len(phenomena))
plt.bar(phenomena, phen_counts)
plt.title("現象コード 件数")
plt.ylabel("件数")
plt.tight_layout()
plt.savefig("phenomenon-bar.png")
plt.close()

plt.pie(phen_counts, labels=phenomena, autopct="%.1f%%")
plt.title("現象コード 構成比")
plt.tight_layout()
plt.savefig("phenomenon-pie.png")
plt.close()

# ===== 4. 客先別 件数＋金額 =====
cust_counts = rng.integers(10, 50, size=len(customers))
cust_amounts = rng.integers(100, 300, size=len(customers))

fig, ax1 = plt.subplots()
ax1.bar(customers, cust_counts, color="lightblue", label="件数")
ax1.set_ylabel("件数")

ax2 = ax1.twinx()
ax2.plot(customers, cust_amounts, color="red", marker="o", label="金額")
ax2.set_ylabel("金額")

plt.title("客先別 件数＋金額")
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig("customer-bar.png")
plt.close()
