import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, List, Trash2, CalendarDays, Camera } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase'; // 他人のプロジェクト用firebaseConfigで初期化したものをimport
import { generateUniqueId } from '../utils/generateUniqueId';

// ... (interfaceは変更なし)
interface ScannedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  teamaedori: boolean;
  expiryDate: string;
}

interface ReceiptScannerProps {
  setCurrentView: (view: 'dashboard' | 'history' | 'scanner') => void;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ setCurrentView }) => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scanReceipt = async (imageFile: File) => {
    setIsScanning(true);
    try {
      // --- 本番用Cloud Functions呼び出し（後で有効化） ---
      // // ファイルをBase64に変換
      // const toBase64 = (file: File) =>
      //   new Promise<string>((resolve, reject) => {
      //     const reader = new FileReader();
      //     reader.onload = () => resolve((reader.result as string).split(',')[1]);
      //     reader.onerror = reject;
      //     reader.readAsDataURL(file);
      //   });
      // const base64Image = await toBase64(imageFile);
      // const recognizeText = httpsCallable(functions, 'recognizeTextFromImage');
      // const result = await recognizeText({ image: base64Image });
      // const text: string = (result.data as any).text || '';
      // const lines = text.split('\n').filter(line => line.trim() !== '');
      // const items = lines.map((line, idx) => {
      //   const match = line.match(/(.+?)\s+(\d+)/);
      //   return match ? {
      //     id: generateUniqueId(),
      //     name: match[1],
      //     price: Number(match[2]),
      //     quantity: 1,
      //     teamaedori: false,
      //     expiryDate: '',
      //   } : null;
      // }).filter(Boolean) as ScannedItem[];
      // setScannedItems(items);

      // --- ダミーデータ返却 ---
      const dummyItems: ScannedItem[] = [
        {
          id: generateUniqueId(),
          name: '牛乳',
          price: 120,
          quantity: 1,
          teamaedori: false,
          expiryDate: '',
        },
        {
          id: generateUniqueId(),
          name: 'ヨーグルト',
          price: 98,
          quantity: 1,
          teamaedori: false,
          expiryDate: '',
        },
        {
          id: generateUniqueId(),
          name: 'チーズ',
          price: 180,
          quantity: 1,
          teamaedori: false,
          expiryDate: '',
        },
      ];
      setScannedItems(dummyItems);
    } catch (error) {
      console.error('スキャン中にエラーが発生しました:', error);
    } finally {
      setIsScanning(false);
    }
  };
  
  // input要素のクリックをトリガーする関数を削除
  // const handleFileSelect = () => { fileInputRef.current?.click(); };
  // const handleCameraCapture = () => { cameraInputRef.current?.click(); };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      scanReceipt(file);
    }
  };
  
  const handleCameraUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      scanReceipt(file);
    }
  };

  // ... (他の関数は変更なし)
  const handleToggleTeamaedori = (id: string, isChecked: boolean) => {
    setScannedItems(items => items.map(item =>
      item.id === id ? { ...item, teamaedori: isChecked } : item
    ));
  };

  const handleExpiryDateChange = (id: string, date: string) => {
    setScannedItems(items => items.map(item =>
      item.id === id ? { ...item, expiryDate: date } : item
    ));
  };

  const handleSaveItems = () => {
    console.log("Saving items:", scannedItems);
    setTimeout(() => {
      setScannedItems([]);
      setCurrentView('dashboard');
    }, 1000);
  };

  const handleRemoveItem = (id: string) => {
    setScannedItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotalPoints = () => {
    const teamaedoriItems = scannedItems.filter(item => item.teamaedori);
    return teamaedoriItems.length * 10;
  };

  const calculateFoodLossReduction = () => {
    const teamaedoriItems = scannedItems.filter(item => item.teamaedori);
    return teamaedoriItems.length * 100;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">レシートスキャン</h1>

      {scannedItems.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
          <p className="text-gray-600 mb-4">レシートをスキャンして商品を登録しましょう。</p>
          <div className="flex justify-center space-x-4 mb-6">
            {/* 修正箇所: <button>タグではなく<label>タグを使用 */}
            <label
              htmlFor="file-upload-input"
              className="flex-1 flex flex-col items-center justify-center p-4 rounded-lg bg-blue-500 text-white font-semibold shadow-md hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <Upload className="w-8 h-8 mb-2" />
              ファイルから選択
            </label>
            <input
              type="file"
              id="file-upload-input" // labelのhtmlForと一致させる
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isScanning}
            />

            {/* 修正箇所: <button>タグではなく<label>タグを使用 */}
            <label
              htmlFor="camera-upload-input"
              className="flex-1 flex flex-col items-center justify-center p-4 rounded-lg bg-green-500 text-white font-semibold shadow-md hover:bg-green-600 transition-colors cursor-pointer"
            >
              <Camera className="w-8 h-8 mb-2" />
              カメラで撮影
            </label>
            <input
              type="file"
              id="camera-upload-input" // labelのhtmlForと一致させる
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleCameraUpload}
              disabled={isScanning}
            />
          </div>
          <div className="bg-gray-100 rounded-lg p-4 text-left border border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center mb-2">
              <List className="w-5 h-5 mr-2 text-green-500" />
              使い方
            </h3>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>1. レシート全体が写るように撮影または選択</li>
              <li>2. 自動で商品情報を読み取ります</li>
              <li>3. 「てまえどり」した商品にチェックを入れます</li>
              <li>4. 「保存」ボタンでポイント獲得！</li>
            </ul>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
          <div className="flex justify-center items-center h-24">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4">レシートをスキャンしています...</p>
        </div>
      )}

      {scannedItems.length > 0 && !isScanning && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">スキャン結果</h2>
            <ul className="space-y-4">
              {scannedItems.map(item => (
                <li key={item.id} className="flex items-start justify-between border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex-grow mr-4">
                    <div className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        checked={item.teamaedori}
                        onChange={(e) => handleToggleTeamaedori(item.id, e.target.checked)}
                        id={`teamaedori-${item.id}`}
                        className="form-checkbox h-5 w-5 text-green-600 rounded mr-2 focus:ring-green-500"
                      />
                      <label htmlFor={`teamaedori-${item.id}`} className="text-gray-800 text-base font-semibold flex-grow">
                        {item.name}
                      </label>
                      <span className="text-gray-600 text-sm whitespace-nowrap">
                        ¥{item.price}
                      </span>
                    </div>
                    {item.teamaedori && (
                      <div className="flex items-center mt-2 pl-7">
                        <CalendarDays className="w-4 h-4 text-gray-500 mr-2" />
                        <label htmlFor={`expiry-${item.id}`} className="sr-only">賞味期限</label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => handleExpiryDateChange(item.id, e.target.value)}
                          id={`expiry-${item.id}`}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                    <span className="sr-only">削除</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-green-500 text-white rounded-xl shadow-lg p-6 text-center mb-6">
            <h3 className="font-bold text-lg mb-2">獲得予定</h3>
            <p className="text-3xl font-extrabold mb-1">{calculateTotalPoints()} ポイント</p>
            <p className="text-sm font-semibold">食品ロス削減量: {calculateFoodLossReduction()}g</p>
          </div>
          <button
            onClick={handleSaveItems}
            className="w-full py-4 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="inline-block w-6 h-6 mr-2" />
            保存
          </button>
        </>
      )}
    </div>
  );
};

export default ReceiptScanner;