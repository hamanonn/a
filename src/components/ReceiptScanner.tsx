import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Camera, 
  Upload, 
  Check, 
  X, 
  Loader, 
  AlertCircle,
  ShoppingBag,
  Plus
} from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { processReceiptWithVision, parseReceiptText } from '../utils/ocrService';

interface ScannedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  isTemaeSelected: boolean;
  estimatedReduction: number; // kg
}

interface ScanResult {
  items: ScannedItem[];
  totalAmount: number;
  storeName: string;
  date: string;
}

const ReceiptScanner: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // デモ用のOCR結果シミュレーション
  const simulateOCRResult = (): ScanResult => {
    // より現実的な商品データのパターン
    const productPatterns = [
      // 乳製品
      { name: '明治おいしい牛乳 1000ml', price: 248, category: '乳製品', reduction: 0.4 },
      { name: '森永のおいしい低脂肪乳 1L', price: 198, category: '乳製品', reduction: 0.4 },
      { name: 'ダノンビオヨーグルト 4個', price: 298, category: '乳製品', reduction: 0.3 },
      { name: 'ブルガリアヨーグルト 400g', price: 158, category: '乳製品', reduction: 0.2 },
      
      // パン類
      { name: 'ヤマザキ超芳醇食パン 6枚', price: 168, category: 'パン類', reduction: 0.2 },
      { name: 'パスコ超熟食パン 8枚', price: 148, category: 'パン類', reduction: 0.2 },
      { name: 'フジパンメロンパン', price: 128, category: 'パン類', reduction: 0.1 },
      { name: 'ヤマザキランチパック', price: 138, category: 'パン類', reduction: 0.1 },
      
      // 調理済食品
      { name: 'セブンイレブン幕の内弁当', price: 498, category: '調理済食品', reduction: 0.8 },
      { name: 'ファミマ唐揚げ弁当', price: 398, category: '調理済食品', reduction: 0.7 },
      { name: 'ローソンサラダチキン', price: 248, category: '調理済食品', reduction: 0.3 },
      { name: 'セブン-イレブンおにぎり梅', price: 118, category: '調理済食品', reduction: 0.2 },
      { name: 'ファミマ焼き鳥串', price: 158, category: '調理済食品', reduction: 0.2 },
      
      // 惣菜
      { name: 'コロッケ 2個入り', price: 158, category: '惣菜', reduction: 0.3 },
      { name: 'ポテトサラダ 200g', price: 198, category: '惣菜', reduction: 0.2 },
      { name: '唐揚げ 5個入り', price: 298, category: '惣菜', reduction: 0.4 },
      { name: 'マカロニサラダ 150g', price: 148, category: '惣菜', reduction: 0.2 },
      
      // 冷凍食品
      { name: '冷凍餃子 12個入り', price: 298, category: '冷凍食品', reduction: 0.3 },
      { name: '冷凍チャーハン 450g', price: 348, category: '冷凍食品', reduction: 0.4 },
      { name: '冷凍うどん 3食入り', price: 198, category: '冷凍食品', reduction: 0.3 },
      
      // 飲料
      { name: 'コカ・コーラ 500ml', price: 148, category: '飲料', reduction: 0.1 },
      { name: 'いろはす天然水 555ml', price: 108, category: '飲料', reduction: 0.1 },
      { name: 'カルピス 470ml', price: 198, category: '飲料', reduction: 0.1 },
      
      // デザート
      { name: 'ハーゲンダッツバニラ', price: 298, category: 'デザート', reduction: 0.2 },
      { name: 'プリン 3個パック', price: 198, category: 'デザート', reduction: 0.2 },
      { name: 'どら焼き 2個入り', price: 248, category: 'デザート', reduction: 0.2 }
    ];
    
    // ランダムに3-6個の商品を選択
    const numItems = Math.floor(Math.random() * 4) + 3;
    const selectedProducts = [];
    const usedIndices = new Set();
    
    for (let i = 0; i < numItems; i++) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * productPatterns.length);
      } while (usedIndices.has(randomIndex));
      
      usedIndices.add(randomIndex);
      const product = productPatterns[randomIndex];
      
      selectedProducts.push({
        id: (i + 1).toString(),
        name: product.name,
        price: product.price + Math.floor(Math.random() * 40) - 20, // ±20円の価格変動
        quantity: 1,
        category: product.category,
        isTemaeSelected: false,
        estimatedReduction: product.reduction
      });
    }
    
    // 店舗名もランダムに選択
    const storeNames = [
      'セブン-イレブン 渋谷店',
      'ファミリーマート 新宿店',
      'ローソン 池袋店',
      'イオン 品川店',
      'イトーヨーカドー 上野店',
      'マルエツ 恵比寿店',
      'ライフ 目黒店',
      'サミット 五反田店'
    ];
    
    const randomStore = storeNames[Math.floor(Math.random() * storeNames.length)];


    return {
      items: selectedProducts,
      totalAmount: selectedProducts.reduce((sum, item) => sum + item.price * item.quantity, 0),
      storeName: randomStore,
      date: new Date().toLocaleDateString('ja-JP')
    };
  };

  const handleFileUpload = async (file: File) => {
    setScanning(true);
    setError('');
    
    try {
      // Google Vision API キーが設定されている場合は実際のOCR処理を実行
      if (import.meta.env.VITE_GOOGLE_VISION_API_KEY) {
        try {
          const ocrResult = await processReceiptWithVision(file);
          
          // OCR結果をScanResult形式に変換
          const scanResult: ScanResult = {
            items: ocrResult.items.map((item, index) => ({
              id: (index + 1).toString(),
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              category: categorizeProduct(item.name),
              isTemaeSelected: false,
              estimatedReduction: estimateReduction(item.name, item.price)
            })),
            totalAmount: ocrResult.totalAmount,
            storeName: ocrResult.storeName,
            date: ocrResult.date
          };
          
          setScanResult(scanResult);
          setScanning(false);
          return;
        } catch (ocrError) {
          console.error('OCR processing failed:', ocrError);
          setError('レシートの読み取りに失敗しました。デモモードで表示します。');
        }
      } else {
        console.log('Google Vision API key not found, using demo mode');
      }
      
      // APIキーがない場合やOCR処理が失敗した場合はデモモードを使用
      setTimeout(() => {
        const result = simulateOCRResult();
        setScanResult(result);
        setScanning(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setError('レシートのアップロードに失敗しました');
      setScanning(false);
    }
  };

  // 商品名からカテゴリを推定する関数
  const categorizeProduct = (productName: string): string => {
    const name = productName.toLowerCase();
    
    if (name.includes('牛乳') || name.includes('ヨーグルト') || name.includes('チーズ')) {
      return '乳製品';
    } else if (name.includes('パン') || name.includes('食パン')) {
      return 'パン類';
    } else if (name.includes('弁当') || name.includes('おにぎり') || name.includes('サンドイッチ')) {
      return '調理済食品';
    } else if (name.includes('サラダ') || name.includes('惣菜') || name.includes('コロッケ')) {
      return '惣菜';
    } else if (name.includes('冷凍')) {
      return '冷凍食品';
    } else if (name.includes('ジュース') || name.includes('水') || name.includes('茶')) {
      return '飲料';
    } else if (name.includes('アイス') || name.includes('プリン') || name.includes('ケーキ')) {
      return 'デザート';
    } else {
      return 'その他';
    }
  };

  // 商品名と価格から削減量を推定する関数
  const estimateReduction = (productName: string, price: number): number => {
    const name = productName.toLowerCase();
    
    // 商品タイプ別の基本削減量
    let baseReduction = 0.1;
    
    if (name.includes('弁当')) {
      baseReduction = 0.8;
    } else if (name.includes('牛乳') || name.includes('ジュース')) {
      baseReduction = 0.4;
    } else if (name.includes('パン') || name.includes('サンドイッチ')) {
      baseReduction = 0.2;
    } else if (name.includes('サラダ') || name.includes('惣菜')) {
      baseReduction = 0.3;
    } else if (name.includes('アイス') || name.includes('デザート')) {
      baseReduction = 0.2;
    }
    
    // 価格に基づいて調整（高価格商品ほど削減量が多い傾向）
    const priceMultiplier = Math.min(price / 200, 2.0);
    
    return Math.round(baseReduction * priceMultiplier * 10) / 10;
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const toggleTemaeSelection = (itemId: string) => {
    if (!scanResult) return;
    
    setScanResult({
      ...scanResult,
      items: scanResult.items.map(item =>
        item.id === itemId
          ? { ...item, isTemaeSelected: !item.isTemaeSelected }
          : item
      )
    });
  };

  const calculatePoints = () => {
    if (!scanResult) return 0;
    
    return scanResult.items
      .filter(item => item.isTemaeSelected)
      .reduce((total, item) => {
        // カテゴリーごとのポイント計算
        const basePoints = Math.floor(item.price * 0.1);
        const categoryBonus = item.category === '調理済食品' ? 50 : 30;
        return total + basePoints + categoryBonus;
      }, 0);
  };

  const calculateReduction = () => {
    if (!scanResult) return 0;
    
    return scanResult.items
      .filter(item => item.isTemaeSelected)
      .reduce((total, item) => total + item.estimatedReduction, 0);
  };

  const handleSubmit = async () => {
    if (!scanResult || !userProfile) return;
    
    setProcessing(true);
    
    try {
      const selectedItems = scanResult.items.filter(item => item.isTemaeSelected);
      const points = calculatePoints();
      const reduction = calculateReduction();
      
      if (selectedItems.length === 0) {
        setError('てまえどりした商品を選択してください');
        setProcessing(false);
        return;
      }
      
      // アクティビティを保存
      const activityData = {
        userId: userProfile.uid,
        storeName: scanResult.storeName,
        items: selectedItems.map(item => item.name),
        points,
        reductionAmount: reduction,
        receiptTotal: scanResult.totalAmount,
        createdAt: new Date()
      };
      
      // 開発環境ではローカルストレージに保存
      if (import.meta.env.DEV) {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.unshift({ ...activityData, id: Date.now().toString() });
        localStorage.setItem('activities', JSON.stringify(activities));
      } else {
        await addDoc(collection(db, 'activities'), {
          ...activityData,
          createdAt: Timestamp.now()
        });
      }
      
      // ユーザープロフィールを更新
      await updateUserProfile({
        totalPoints: userProfile.totalPoints + points,
        totalReduction: userProfile.totalReduction + reduction
      });
      
      // 成功メッセージと初期化
      alert(`🎉 おめでとうございます！\n${points}ポイント獲得\n${reduction.toFixed(1)}kgの食品ロス削減に貢献しました！`);
      setScanResult(null);
      
    } catch (error) {
      console.error('Error saving activity:', error);
      setError('データの保存に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const selectedCount = scanResult?.items.filter(item => item.isTemaeSelected).length || 0;
  const totalPoints = calculatePoints();
  const totalReduction = calculateReduction();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">レシートスキャン</h1>
        <p className="text-gray-600">てまえどりした商品をスキャンしてポイントゲット！</p>
      </div>

      {/* ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      {!scanning && !scanResult && (
        <div className="space-y-6">
          {/* アップロードボタン */}
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={handleCameraCapture}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-green-300 rounded-2xl hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <Camera className="w-12 h-12 text-green-600 mb-4" />
              <span className="font-medium text-gray-800">カメラで撮影</span>
              <span className="text-sm text-gray-600 mt-1">レシートを直接撮影</span>
            </button>
            
            <button
              onClick={handleFileSelect}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-12 h-12 text-blue-600 mb-4" />
              <span className="font-medium text-gray-800">ファイル選択</span>
              <span className="text-sm text-gray-600 mt-1">保存済みの画像から選択</span>
            </button>
          </div>

          {/* 使い方の説明 */}
          <div className="bg-green-50 rounded-2xl p-6">
            <h3 className="font-semibold text-green-800 mb-3">使い方</h3>
            <ol className="space-y-2 text-sm text-green-700">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                レシートを撮影またはアップロード
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                「てまえどり」した商品にチェック
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                ポイント獲得で食品ロス削減に貢献！
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* スキャン中 */}
      {scanning && (
        <div className="text-center py-12">
          <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">レシートを解析中...</p>
          <p className="text-sm text-gray-500 mt-1">少々お待ちください</p>
        </div>
      )}

      {/* スキャン結果 */}
      {scanResult && (
        <div className="space-y-6">
          {/* 店舗情報 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center mb-4">
              <ShoppingBag className="w-6 h-6 text-gray-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-800">{scanResult.storeName}</h3>
                <p className="text-sm text-gray-600">{scanResult.date} | 合計: ¥{scanResult.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* 商品一覧 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">てまえどりした商品を選択してください</h3>
            <div className="space-y-3">
              {scanResult.items.map((item) => (
                <div 
                  key={item.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    item.isTemaeSelected 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleTemaeSelection(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                          item.isTemaeSelected 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300'
                        }`}>
                          {item.isTemaeSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.category} | ¥{item.price} × {item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                    {item.isTemaeSelected && (
                      <div className="text-right text-sm">
                        <p className="text-green-600 font-medium">
                          +{Math.floor(item.price * 0.1) + (item.category === '調理済食品' ? 50 : 30)}pt
                        </p>
                        <p className="text-gray-500">{item.estimatedReduction}kg削減</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* サマリーと送信 */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">選択した商品: {selectedCount}個</p>
                <p className="text-2xl font-bold">{totalPoints}ポイント獲得予定</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">削減量</p>
                <p className="text-xl font-semibold">{totalReduction.toFixed(1)}kg</p>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                <div className="flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setScanResult(null);
                  setError('');
                }}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={processing || selectedCount === 0}
                className="flex-1 bg-white hover:bg-gray-100 text-green-600 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 inline mr-2" />
                    ポイント獲得
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;