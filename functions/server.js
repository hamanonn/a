const express = require('express');
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const cors = require('cors');

const app = express();
const port = 3001; // Reactアプリとは異なるポート番号

// CORS設定
app.use(cors());

// Google Vision APIクライアントの初期化
const client = new ImageAnnotatorClient({
  key: 'AIzaSyA-aZHo8UztXrAm74h6_7nZi1TxYPspw80', // 先生から渡されたAPIキーをここに入れる
});

const upload = multer({ storage: multer.memoryStorage() });

// レシートスキャン用のAPIエンドポイント
app.post('/api/scan-receipt', upload.single('receiptImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const [result] = await client.documentTextDetection(req.file.buffer);
    const fullText = result.fullTextAnnotation.text;

    // OCR結果の文字列から商品データを解析
    const parsedItems = parseOcrResult(fullText);

    res.json({ items: parsedItems });
  } catch (error) {
    console.error('Vision API Error:', error);
    res.status(500).send('OCR processing failed.');
  }
});

// 読み取ったテキストを商品リストに変換する関数
function parseOcrResult(text) {
  console.log("OCRで読み取ったテキスト:", text); // 読み取ったテキストをログに出力

  const lines = text.split('\n');
  const items = [];
  const priceRegex = /(\d{1,3}(,\d{3})?)$/; // 行の最後にある価格を検出する正規表現

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (priceMatch) {
      const priceString = priceMatch[1].replace(',', '');
      const price = parseInt(priceString, 10);
      
      // 価格の前の部分を商品名として抽出
      const name = line.replace(priceMatch[0], '').trim();
      
      // 商品名が空でなく、価格が有効な数字の場合にのみ追加
      if (name && !isNaN(price)) {
        items.push({
          id: String(items.length + 1), // 仮のID
          name: name,
          price: price,
          quantity: 1, // 数量は一旦1と仮定
          teamaedori: false,
          expiryDate: ''
        });
      }
    }
  }
  return items;
}

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});