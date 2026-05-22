# MN_Solution Vue Architecture

## Quy tắc lõi

1. Vue component chỉ xử lý UI và sự kiện người dùng.
2. Store giữ trạng thái chung.
3. Core engine xử lý CAD/DAC thuần JavaScript.
4. Renderer chỉ vẽ từ state, không tự quyết logic.
5. Zone là nguồn sự thật chính cho panel.

## Luồng chuẩn

```txt
UI event -> Store action -> Core engine -> Store update -> Renderer redraw
```

## Giai đoạn tiếp theo

- Nâng cấp zone-engine để nhận đầy đủ cạnh khép kín phức tạp.
- Bổ sung undo/redo trong stores/history.
- Bổ sung save/load project đầy đủ.
- Bổ sung 3D bằng Three.js khi cần.
