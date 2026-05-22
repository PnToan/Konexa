# MN_Solution - Vue Clean Build

Bản này là nền Vue 3 + Vite được dựng mới từ đầu, dùng zip HTML/JS/CSS cũ làm bản tham khảo UI và chức năng.

## Mục tiêu

- Giữ tinh thần UI cũ: topbar, library bar, toolbar trái, canvas 2D, mini 3D preview, bottom params, right panel.
- Tách rõ Vue component, store, core engine, renderer, command.
- Sẵn sàng cập nhật online/web về sau.
- Không bê nguyên hệ `window.MN_*` cũ vào Vue.

## Chạy local

```bash
npm install
npm run dev
```

Mở:

```txt
http://localhost:5173
```

Mở qua IP LAN:

```txt
http://IP_MAY_CUA_BAN:5173
```

## Build production

```bash
npm run build
npm run preview
```

## Cấu trúc chính

```txt
src/components  = UI Vue
src/stores      = state reactive dùng chung
src/core        = logic CAD/DAC thuần JS
src/renderers   = render canvas 2D / preview 3D
src/commands    = nhập số, /n, phím tắt
public/icons    = icon giữ từ bản cũ
```
