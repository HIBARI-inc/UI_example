# integration フォルダについて

採用案に沿って選択した各UIページを、元ファイルと同一内容のまま `integration` 配下へコピーしています。レイアウト・文言・挙動の違いが出ないよう、HTML / CSS / JS / データを丸ごと反映しました。

- **共通スタイル**: 元の `styles.css` を `integration/styles.css` に複製し、各ページは従来通り `../styles.css` を読み込む構成です。リポジトリ直下の `styles.css` を削除しても表示が変わりません。
- **ページ本体**: 採用案と対応付けられたファイルをそのまま配置しています。  
  - catalog → `catalog/index7.html`  
  - ATS → `ats/index7.html`  
  - achievements → `achievements/index_modal.html`  
  - nonconformity_information → `nonconformity_information/index6.html`  
  - physical_properties → `physical_properties/index4.html`  
  - test_information → `test_information/index1.html`
- **アセット**: `assets/`、`docs/`、`data/` などのサブフォルダを丸ごとコピーし、相対パスはオリジナルと同一です。

ローカル確認は、`integration` ディレクトリを静的サイトとして開くか、各 `index.html` をブラウザで直接表示してください。
