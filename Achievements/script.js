/**
 * ページの読み込みが完了したときに実行される初期化関数
 */
document.addEventListener('DOMContentLoaded', function() {
    // 今日の日付を終了日に設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-to').value = today;

    // CSVデータを読み込んでテーブルを生成
    loadTableData();
});

/**
 * data.csvを非同期で読み込み、HTMLテーブルを生成する
 */
async function loadTableData() {
    const tableBody = document.querySelector('#resultsTable tbody');
    try {
        const response = await fetch('data.csv');
        const csvData = await response.text();
        const rows = csvData.trim().split('\n').slice(1); // ヘッダー行を除外

        rows.forEach(row => {
            const columns = row.split(',');
            const tr = document.createElement('tr');

            // 状態に応じたスタイルを適用するためのヘルパー関数
            const getStatusSpan = (statusText) => {
                let statusClass = '';
                switch (statusText) {
                    case '正常':
                        statusClass = 'status-normal';
                        break;
                    case '注意':
                        statusClass = 'status-warning';
                        break;
                    case '異常':
                        statusClass = 'status-error';
                        break;
                    default:
                        break;
                }
                return `<span class="${statusClass}">${statusText}</span>`;
            };
            
            // 各セルを生成
            tr.innerHTML = `
                <td>${columns[0]}</td>
                <td>${columns[1]}</td>
                <td>${columns[2]}</td>
                <td>${columns[3]}</td>
                <td>${columns[4]}</td>
                <td>${getStatusSpan(columns[5])}</td>
                <td>${columns[6]}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('CSVファイルの読み込みに失敗しました:', error);
        tableBody.innerHTML = `<tr><td colspan="7">データの読み込みに失敗しました。</td></tr>`;
    }
}

/**
 * 検索ボタンがクリックされたときの処理（装飾的な機能）
 */
function searchResults() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    console.log('検索条件:', { dateFrom, dateTo });

    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '検索中...';
    button.disabled = true;

    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        addAiMessage('ai', `期間: ${dateFrom}〜${dateTo}で検索を実行しました。（現在この機能はデモです）`);
    }, 1000);
}

/**
 * エクスポートボタンがクリックされたときの処理
 */
function exportData() {
    console.log('データをエクスポート中...');
    addAiMessage('ai', 'データのエクスポートを開始しました。ダウンロードが完了するまでお待ちください。（現在この機能はデモです）');
}

/**
 * AIアシスタントにメッセージを送信する
 */
function sendAiMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (message) {
        addAiMessage('user', message);
        input.value = '';

        // AIからの応答をシミュレート
        setTimeout(() => {
            const responses = [
                'データを分析した結果、正常な範囲内の値です。',
                '異常値が検出されました。詳細な調査をお勧めします。',
                '傾向分析によると、このパラメータは安定しています。',
                '過去のデータと比較すると、改善傾向が見られます。',
                'より詳しい分析が必要な場合は、期間を絞って再検索してください。',
                'メンテナンススケジュールに基づいて、予防保全を実施することを推奨します。'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addAiMessage('ai', randomResponse);
        }, 1000);
    }
}

/**
 * 事前定義された質問をAIに送信する
 * @param {string} question - 送信する質問テキスト
 */
function askPredefinedQuestion(question) {
    const input = document.getElementById('aiInput');
    input.value = question;
    sendAiMessage();
}

/**
 * チャットウィンドウに新しいメッセージを追加する
 * @param {string} sender - 送信者 ('user' または 'ai')
 * @param {string} content - メッセージの内容
 */
function addAiMessage(sender, content) {
    const messagesContainer = document.getElementById('aiMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' +
                      now.getMinutes().toString().padStart(2, '0');

    messageDiv.innerHTML = `
        <div class="message-content">${content.replace(/\n/g, '<br>')}</div>
        <div class="message-time">${timeString}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // 自動スクロール
}

/**
 * 入力フィールドでEnterキーが押されたときにメッセージを送信する
 * @param {KeyboardEvent} event - キーボードイベント
 */
function handleAiKeyPress(event) {
    if (event.key === 'Enter') {
        sendAiMessage();
    }
}