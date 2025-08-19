// functions/src/index.ts

// Firebase Functions と Google Cloud Vision API クライアントライブラリをインポート
import * as functions from 'firebase-functions';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Vision API クライアントの初期化
// プロジェクトIDは環境変数から取得するのが安全ですが、ここでは直接指定の例
// const client = new ImageAnnotatorClient({ projectId: process.env.GCLOUD_PROJECT });
const client = new ImageAnnotatorClient(); // プロジェクトが環境変数で設定されていればこれだけでOK

// 画像のテキストを認識するHTTP Callable Function を作成
export const recognizeTextFromImage = functions.https.onCall(async (data, context) => {
    // 認証済みのユーザーからのみ呼び出しを許可（オプション）
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const imageData: string = data.image; // アプリから送られてくる画像データ（Base64形式を想定）

    if (!imageData) {
        throw new functions.https.HttpsError('invalid-argument', 'Image data is required.');
    }

    try {
        // Google Cloud Vision API に画像を送信し、テキスト認識をリクエスト
        const [result] = await client.textDetection({
            image: { content: imageData }, // Base64形式の画像データを送信
        });

        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
            // 検出されたテキストの全体を返す
            const fullText = detections[0].description; // 最初の要素に全体のテキストが入っている
            console.log('Detected text:', fullText);
            return { text: fullText };
        } else {
            console.log('No text detected.');
            return { text: 'No text detected.' };
        }

    } catch (error: any) { // エラーの型を指定 (anyまたは適切な型)
        console.error('Error calling Vision API:', error);
        // エラーをアプリに返す
        throw new functions.https.HttpsError('internal', 'Failed to process image.', error.message);
    }
});
