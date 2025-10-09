// Universal Dashboard Script

document.addEventListener('DOMContentLoaded', () => {
    // このページにダッシュボードの部品（表本体）があるか確認
    const tableBody = document.querySelector('[data-jshook="table-body"]');
    if (!tableBody) {
        // なければ、このスクリプトはここで処理を終了
        return;
    }

    // Dropdown handlers are attached when CSV has been parsed (buildColumnDropdown).
    // This avoids early/late handler conflicts and ensures proper positioning.

    // ダッシュボードの部品があった場合、CSVを読み込むためのライブラリをロード
    // 既に Papa が存在する場合は再読み込みを避ける
    if (window.Papa) {
        initializeDashboard();
    } else {
        const papaScript = document.createElement('script');
        papaScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js';
        // ライブラリがロードされたら、ダッシュボードの初期化を開始
        papaScript.onload = () => {
            initializeDashboard();
        };
        // ライブラリのロードに失敗した場合のエラー処理
        papaScript.onerror = () => {
            console.error("CSV Parsing library (Papa Parse) failed to load.");
            tableBody.innerHTML = `<tr><td colspan="7">エラー: 必須ライブラリを読み込めませんでした。</td></tr>`;
        };
        document.head.appendChild(papaScript);
    }
});

/**
 * ダッシュボードのすべての機能を初期化するメイン関数
 */
function initializeDashboard() {
    // --- ダッシュボードで使う変数を準備 ---
    let allData = [];
    let filteredData = [];
    let availableColumns = []; // CSVヘッダ配列
    let visibleColumns = []; // 表示中の列キー配列

    // --- ページ上の部品（HTML要素）を取得 ---
    const tableBody = document.querySelector('[data-jshook="table-body"]');
    const searchButton = document.querySelector('[data-jshook="search-button"]');
    const exportButton = document.querySelector('[data-jshook="export-button"]');
    const dateFromInput = document.querySelector('[data-jshook="date-from"]');
    const dateToInput = document.querySelector('[data-jshook="date-to"]');
    const categorySelect = document.querySelector('[data-jshook="category-select"]');

    // AIアシスタントの部品
    const chatDisplay = document.querySelector('[data-jshook="chat-display"]');
    const chatInput = document.querySelector('[data-jshook="chat-input"]');
    const chatSendButton = document.querySelector('[data-jshook="chat-send"]');
    const suggestionButtonsContainer = document.querySelector('[data-jshook="suggestion-buttons"]');

    // --- 主要な関数 ---

    /**
     * CSVデータを読み込み、最初の表表示をトリガーする
     */
    async function loadData() {
        try {
            // data.csv を複数候補パスで試行して fetch
            const tryPaths = [];
            // まずはページ相対（既存）
            tryPaths.push('data.csv');
            // スクリプトの場所（document.currentScript）を基準に data.csv を探す
            let scriptBase = '';
            if (document.currentScript && document.currentScript.src) {
                const url = new URL(document.currentScript.src);
                url.pathname = url.pathname.replace(/[^/]*$/, ''); // ディレクトリ部分のみ
                scriptBase = url.pathname.replace(/\/$/, '');
                // 例: /integration/achievements -> /integration/achievements/data.csv
                tryPaths.push(scriptBase + '/data.csv');
                // ルート相対パスも追加
                tryPaths.push('/' + scriptBase.replace(/^\//, '') + '/data.csv');
            }
            // さらに一般的な候補（integration/achievements/data.csv）
            tryPaths.push('integration/achievements/data.csv');

            let response = null;
            let csvData = null;
            for (const p of tryPaths) {
                try {
                    // console.log('[debug] trying fetch', p);
                    const r = await fetch(p);
                    if (!r.ok) continue;
                    response = r;
                    csvData = await r.text();
                    break;
                } catch (e) {
                    // ignore and try next
                }
            }
            if (!response) throw new Error('data.csv not found in candidate paths: ' + tryPaths.join(', '));
            
            // PapaParseでCSVをパース
            const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
            allData = parsed.data;
            // ヘッダ情報を取得（parsed.meta.fieldsは存在するはず）
            availableColumns = parsed.meta && parsed.meta.fields ? parsed.meta.fields : Object.keys(allData[0] || {});
            // デフォルトで主要な列を表示（日付、カテゴリ、項目名、実績値、単位、状態、備考）
            const preferred = ['日付','カテゴリ','項目名','実績値','単位','状態','備考'];
            visibleColumns = availableColumns.filter(h => preferred.includes(h));
            // ドロップダウンUIを生成
            buildColumnDropdown();
            
            // 最初のデータフィルタリングと表示を実行
            updateTable();

        } catch (error) {
            console.error("Failed to load or parse data.csv:", error);
            tableBody.innerHTML = `<tr><td colspan="7">データの読み込みに失敗しました。</td></tr>`;
        }
    }

    /**
     * 入力された条件でデータをフィルタリングし、表を更新する
     */
    function updateTable() {
        // 日付フィルターを適用（カテゴリ選択が削除されたため日付のみを条件として扱う）
        const fromDateStr = dateFromInput ? dateFromInput.value : '';
        const toDateStr = dateToInput ? dateToInput.value : '';
            
            // ▼▼▼ 日付の妥当性チェックを追加 ▼▼▼
            if (fromDateStr && toDateStr) {
                const fromDate = new Date(fromDateStr);
                const toDate = new Date(toDateStr);
                if (toDate < fromDate) {
                    alert('エラー: 終了日は開始日より後の日付を選択してください。');
                    return; // 処理を中断
                }
            }
            // ▲▲▲ ここまで追加 ▲▲▲

            filteredData = allData.filter(row => {
                // `row`が存在しない、または`row['日付']`が文字列でないか空の場合はfalseを返す
                if (!row || typeof row['日付'] !== 'string' || row['日付'] === '') return false;
                
                const rowDate = new Date(row['日付']);
                // 日付が無効な場合はfalseを返す
                if (isNaN(rowDate.getTime())) return false;

                const fromDate = new Date(fromDateStr);
                const toDate = new Date(toDateStr);
                
                // 日付フィルターがない場合は無視
                const isAfterFrom = !fromDateStr || rowDate >= fromDate;
                const isBeforeTo = !toDateStr || rowDate <= toDate;
                // カテゴリフィルターがない場合は無視
                return isAfterFrom && isBeforeTo;
            });
        
        
        populateTable(filteredData);
    }

    /**
     * 渡されたデータを表（table）に書き出す
     */
    function populateTable(data) {
        tableBody.innerHTML = '';

        if (!Array.isArray(visibleColumns) || visibleColumns.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">表示する列が選択されていません。</td></tr>';
            return;
        }

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${visibleColumns.length}">該当するデータがありません。</td></tr>`;
            return;
        }

        // thead を更新（列ヘッダ）
        const table = document.querySelector('.data-table');
        const thead = table.querySelector('thead');
        thead.innerHTML = '';
        const trHead = document.createElement('tr');
        visibleColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);

        // tbody を描画
        data.forEach(row => {
            const tr = document.createElement('tr');
            visibleColumns.forEach(col => {
                const td = document.createElement('td');
                let value = row[col] || '';
                // 状態列はクラス付与で見た目を変えたい場合のサポート
                if (col === '状態') {
                    const span = document.createElement('span');
                    const status = (value || '');
                    const cls = { '注意': 'warning', '異常': 'error' }[status] || 'normal';
                    span.className = `status-${cls}`;
                    span.textContent = status;
                    td.appendChild(span);
                } else if (col === 'カテゴリ') {
                    // 既存のカテゴリマッピングがあればそれを使う
                    const map = { disposal: '処理・廃棄', equipment: '機器・制御', extraction: '抽出・取出', maintenance: 'メンテナンス', measurement: '計測・測定', plant: 'プラント・設備', storage: '貯蔵・保管', supply: '供給・投入', transport: '搬送・運搬' };
                    td.textContent = map[value] || value;
                } else {
                    td.textContent = value;
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }

    /**
     * ドロップダウン（カラム選択）をビルドしてイベントを設定
     */
    function buildColumnDropdown() {
        const panel = document.getElementById('column-dropdown-panel');
        const options = document.getElementById('column-options');
        const btnAll = document.getElementById('col-select-all');
        const btnNone = document.getElementById('col-select-none');
        options.innerHTML = '';

        console.log('[debug] buildColumnDropdown: availableColumns=', availableColumns);

        availableColumns.forEach((col, idx) => {
            const id = `col-opt-${idx}`;
            const wrapper = document.createElement('label');
            wrapper.className = 'column-option';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.value = col;
            input.checked = visibleColumns.includes(col);
            input.addEventListener('change', () => {
                const checked = Array.from(options.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
                visibleColumns = checked;
                populateTable(filteredData);
            });
            wrapper.appendChild(input);
            const span = document.createElement('span');
            span.textContent = col;
            wrapper.appendChild(span);
            options.appendChild(wrapper);
        });

        // 全選択／全解除
        btnAll.addEventListener('click', () => {
            options.querySelectorAll('input[type=checkbox]').forEach(i => i.checked = true);
            visibleColumns = availableColumns.slice();
            populateTable(filteredData);
        });
        btnNone.addEventListener('click', () => {
            options.querySelectorAll('input[type=checkbox]').forEach(i => i.checked = false);
            visibleColumns = [];
            populateTable(filteredData);
        });

    // ドロップダウンの開閉挙動（ボタン真下に固定表示する）
        const toggleBtn = document.getElementById('column-dropdown-button');
        let reposition = null;
        function positionPanelFixed() {
            if (!toggleBtn) return;
            const btnRect = toggleBtn.getBoundingClientRect();
            // パネルを一度表示して幅を測る
            panel.style.visibility = 'hidden';
            panel.style.display = 'block';
            const panelRect = panel.getBoundingClientRect();
            // 左揃えにして表示領域内に収める
            let left = btnRect.left;
            const top = btnRect.bottom; // fixed uses viewport coords
            const maxLeft = Math.max(8, window.innerWidth - panelRect.width - 8);
            left = Math.min(Math.max(8, left), maxLeft);
            panel.style.position = 'fixed';
            panel.style.left = `${left}px`;
            panel.style.top = `${top}px`;
            panel.style.visibility = '';
            console.log('[debug] positionPanelFixed set left,top=', panel.style.left, panel.style.top, 'btnRect:', btnRect, 'panelRect:', panelRect);
        }

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panel.getAttribute('aria-hidden') === 'false';
            if (isOpen) {
                panel.setAttribute('aria-hidden', 'true');
                panel.style.display = 'none';
                window.removeEventListener('resize', reposition);
                window.removeEventListener('scroll', reposition);
            } else {
                panel.setAttribute('aria-hidden', 'false');
                // 位置を決める
                positionPanelFixed();
                // 再描画時に位置を再計算するためのハンドラ
                reposition = () => {
                    positionPanelFixed();
                };
                window.addEventListener('resize', reposition);
                window.addEventListener('scroll', reposition);
                // mark initialized so early handler becomes inert
                window._columnDropdownInitialized = true;
            }
        });
        // ページクリックで閉じる（CSVロード後に登録）
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                panel.setAttribute('aria-hidden', 'true');
                panel.style.display = 'none';
                if (reposition) {
                    window.removeEventListener('resize', reposition);
                    window.removeEventListener('scroll', reposition);
                }
            }
        });
        // 初期は非表示
        panel.style.display = 'none';
    }

    /**
     * 表示中のデータをCSVとしてエクスポートする
     */
    function exportData() {
        if (filteredData.length === 0) {
            alert('エクスポートするデータがありません。');
            return;
        }
        const csv = Papa.unparse(filteredData);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "exported_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- AIアシスタント関連の関数 ---
    function setupAI() {
        if (!chatDisplay || !chatInput || !chatSendButton) return;
        addMessage("実績データに関することなら何でもお答えします。お気軽にご質問ください。", "ai");
        chatSendButton.addEventListener('click', handleUserMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleUserMessage(); });
        if (suggestionButtonsContainer) {
            suggestionButtonsContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    chatInput.value = e.target.getAttribute('data-question') || e.target.textContent;
                    handleUserMessage();
                }
            });
        }
    }

    function handleUserMessage() {
        const userInput = chatInput.value.trim();
        if (userInput === "") return;
        addMessage(userInput, "user");
        chatInput.value = "";
        setTimeout(() => addMessage(getAIResponse(userInput), "ai"), 1000);
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        // メッセージのコンテナを作成
        messageDiv.className = `message ${sender}-message`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);
        chatDisplay.appendChild(messageDiv);
        // スクロールを一番下に移動
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function getAIResponse(input) {
        // ダミーのAI応答
        if (input.includes("異常")) return `本日15:00に「反応炉A温度」で89.5℃の注意アラートが記録されています。`;
        if (input.includes("効率")) return `過去24時間で最も効率的に稼働したのは「抽出装置C」で、稼働率は98.5%でした。`;
        if (input.includes("メンテナンス")) return `来週、10月11日に「搬送ポンプB-2」の定期メンテナンスが予定されています。`;
        return "ご質問ありがとうございます。現在分析中です...";
    }

    // --- 初期化処理の実行 ---
    if (searchButton) searchButton.addEventListener('click', updateTable);
    if (exportButton) exportButton.addEventListener('click', exportData);
    setupAI();
    loadData(); // 最後にデータを読み込んで表示
}