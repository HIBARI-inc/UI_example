// Universal Dashboard Script

document.addEventListener('DOMContentLoaded', () => {
    // このページにダッシュボードの部品（表本体）があるか確認
    const tableBody = document.querySelector('[data-jshook="table-body"]');
    if (!tableBody) {
        // なければ、このスクリプトはここで処理を終了
        return;
    }

    // ダッシュボードの部品があった場合、CSVを読み込むためのライブラリをロード
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
});

/**
 * ダッシュボードのすべての機能を初期化するメイン関数
 */
function initializeDashboard() {
    // --- ダッシュボードで使う変数を準備 ---
    let allData = [];
    let filteredData = [];

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
            // data.csvの代わりにfetchを使用
            const response = await fetch('data.csv');
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const csvData = await response.text();
            
            // PapaParseでCSVをパース
            const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
            allData = parsed.data;
            
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
        // 日付やカテゴリのフィルター部品がないページは、全データを表示
        if (!dateFromInput || !dateToInput || !categorySelect) {
            filteredData = [...allData];
        } else {
            const fromDateStr = dateFromInput.value;
            const toDateStr = dateToInput.value;
            
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

            const category = categorySelect.value;
            
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
                const isCategoryMatch = category === "" || row['カテゴリ'] === category;

                return isAfterFrom && isBeforeTo && isCategoryMatch;
            });
        }
        
        populateTable(filteredData);
    }

    /**
     * 渡されたデータを表（table）に書き出す
     */
    function populateTable(data) {
        tableBody.innerHTML = ''; // 古いデータをクリア

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">該当するデータがありません。</td></tr>';
            return;
        }

        const getCategoryName = (id) => ({ disposal: '処理・廃棄', equipment: '機器・制御', extraction: '抽出・取出', maintenance: 'メンテナンス', measurement: '計測・測定', plant: 'プラント・設備', storage: '貯蔵・保管', supply: '供給・投入', transport: '搬送・運搬' }[id] || id);
        const getStatusClass = (status) => ({ '注意': 'warning', '異常': 'error' }[status] || 'normal');

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row['日付'] || ''}</td>
                <td>${getCategoryName(row['カテゴリ'] || '')}</td>
                <td>${row['項目名'] || ''}</td>
                <td>${row['実績値'] || ''}</td>
                <td>${row['単位'] || ''}</td>
                <td><span class="status-${getStatusClass(row['状態'] || '')}">${row['状態'] || ''}</span></td>
                <td>${row['備考'] || ''}</td>
            `;
            tableBody.appendChild(tr);
        });
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