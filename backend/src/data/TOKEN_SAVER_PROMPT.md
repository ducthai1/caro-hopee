
# PROMPT CHO VIỆC RÀ SOÁT TỪ ĐIỂN TIẾNG VIỆT THỦ CÔNG (MANUAL REVIEW PROMPT)

## Bối cảnh (Context):
- Chúng ta có một file `vietnamese-wordlist.txt` lớn (~256,000 dòng).
- Mục tiêu là làm sạch file này để tạo ra bộ từ điển "tinh túy" cho game Nối Chữ, không chứa rác, không chứa từ vô nghĩa, nhưng phải giữ lại được các từ lóng (slang), phương ngữ (dialect), và các từ ghép có nghĩa trong thực tế.
- **TUYỆT ĐỐI KHÔNG DÙNG VÒNG LẶP (LOOP) HAY MA TRẬN ĐỂ SINH TỪ TỰ ĐỘNG** vì sẽ tạo ra các từ đảo ngược vô nghĩa (ví dụ: "lành hiền" từ "hiền lành", "bàn ăn" vs "ăn bàn").
- **PHƯƠNG PHÁP**: Chia file lớn thành các file nhỏ (chunk) gồm 1500 dòng/file để xử lý thủ công từng file một bằng chính tư duy ngôn ngữ của AI (manual review simulation).

## Nhiệm vụ cụ thể (Specific Task):
Bạn hãy đọc nội dung của file chunk hiện tại (ví dụ: `dictionary-raw/chunk_XXX.txt`) và thực hiện các bước sau:

1.  **Đọc và Phân tích Từng Dòng**:
    - Sử dụng kiến thức ngôn ngữ tiếng Việt của bạn để kiểm tra tính hợp lệ của từng từ.
    - **XÓA BỎ NGAY LẬP TỨC** các trường hợp sau:
        - **Từ đảo ngược vô nghĩa (Inverted Reduplicatives)**: Ví dụ "lành hiền" (sai), "nhanh nhẹ" (sai), "mạp mập" (sai).
        - **Từ ghép hệ thống vô lí (Invalid Systematized Compounds)**: Ví dụ "đẹp rất", "nhanh hơi", "trong ghế", "bên đất".
        - **Rác vụn (Garbage Syllables)**: Các từ đơn âm vô nghĩa hoặc lỗi đánh máy như "ừm", "ửn", "ựt", "uyt", "uynh".
        - **Từ ghép vô nghĩa**: Các từ ghép không tồn tại trong tiếng Việt thực tế.

2.  **Giữ lại (Preserve)**:
    - **Từ lóng (Slang)**: "vô tri", "ra dẻ", "ét o ét", "cơm chó"...
    - **Phương ngữ (Dialect)**: "mần chi", "răng rứa"...
    - **Từ ghép hợp lệ (Compounds)**: Kể cả các từ ít gặp nhưng có nghĩa trong văn học hoặc chuyên ngành.
    - **Từ đảo ngược có nghĩa (Reversible)**: "yêu thương/thương yêu", "đợi chờ/chờ đợi", "lo âu/âu lo"... (Phải giữ cả hai chiều).

3.  **Kết quả (Output)**:
    - Ghi lại danh sách các từ ĐÃ ĐƯỢC DUYỆT (Verified) vào file tương ứng trong thư mục `dictionary-output`.
    - Báo cáo số lượng từ đã loại bỏ và một vài ví dụ điển hình về từ rác đã xóa để tôi kiểm tra.
    - **Cập nhật File Báo Cáo (Progress Report)**:
        - Mở file `dictionary-output/PROGRESS_REPORT.md` (tạo mới nếu chưa có).
        - Ghi thêm một dòng log vào bảng tiến độ:
          `| Chunk | Status | Deleted Count | Timestamp | Deleted Words |`
          Ví dụ: `| chunk_001 | DONE   | 15            | 2026-02-13 | ừ à, nhanh nhẹ, ăn bàn... |`
        - **BẮT BUỘC**: Phải liệt kê TOÀN BỘ các từ đã xóa vào cột `Deleted Words` (hoặc ghi vào phần ghi chú chi tiết dưới bảng nếu quá dài) để tôi có thể review lại xem bạn có xóa nhầm không.
        - Điều này giúp bạn (và tôi) biết chính xác file nào đã xử lý xong để lần sau tiếp tục mà không bị trùng lặp.

## Lưu ý quan trọng (Crucial Note):
- **CHẤT LƯỢNG > SỐ LƯỢNG**. Thà xóa nhầm còn hơn bỏ sót rác.
- Nếu gặp từ nghi ngờ, hãy dùng kiến thức sâu về ngữ nghĩa để đánh giá, đừng chỉ dựa vào mặt chữ.
- Không tự ý thêm từ mới trong bước này, chỉ lọc từ có sẵn.
