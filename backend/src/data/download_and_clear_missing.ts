import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load biến môi trường nếu cần
dotenv.config();

// Định nghĩa model MissingWord đơn giản để script chạy độc lập
const MissingWordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' } // pending, aprobved, rejected
});

// Kiểm tra xem model đã tồn tại chưa để tránh lỗi OverwriteModelError
const MissingWord = mongoose.models.MissingWord || mongoose.model('MissingWord', MissingWordSchema);

async function downloadAndClearMissing() {
  // Ưu tiên lấy từ biến môi trường, fallback về local nếu không có
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/caro-hopee';
  
  try {
    console.log('🔌 Đang kết nối tới MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối thành công!');

    // 1. Lấy toàn bộ từ
    console.log('📥 Đang tải các từ thiếu...');
    const allMissingWords = await MissingWord.find({});
    
    if (allMissingWords.length === 0) {
      console.log('⚠️ Không có từ mới nào để tải.');
      return;
    }

    console.log(`✅ Tìm thấy ${allMissingWords.length} từ.`);

    // 2. Ghi vào file local
    const outputFilePath = path.join(__dirname, 'downloaded_missing_words.txt');
    
    // Lấy danh sách từ (chỉ lấy trường word), lọc trùng và chuẩn hóa
    const uniqueWords = Array.from(new Set(allMissingWords.map(doc => doc.word.trim().toLowerCase())));
    
    // Xử lý ghi file: Ghi nối tiếp (append) với timestamp để dễ theo dõi các batch
    const fileContent = `\n--- Batch downloaded at ${new Date().toISOString()} (${uniqueWords.length} words) ---\n` + uniqueWords.join('\n');

    fs.appendFileSync(outputFilePath, fileContent, 'utf-8');
    console.log(`💾 Đã lưu ${uniqueWords.length} từ vào file: ${outputFilePath}`);

    // 3. Xóa khỏi DB (Xóa tất cả document đã tìm thấy)
    console.log('🗑️ Đang xóa các từ đã tải khỏi Database...');
    const deleteResult = await MissingWord.deleteMany({ _id: { $in: allMissingWords.map(w => w._id) } });
    
    console.log(`✅ Đã xóa ${deleteResult.deletedCount} bản ghi khỏi MongoDB.`);
    console.log('🎉 Hoàn tất quá trình!');

  } catch (error) {
    console.error('❌ Có lỗi xảy ra:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB.');
  }
}

downloadAndClearMissing();
