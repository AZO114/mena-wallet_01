# Mena Wallet

## Overview

تطبيق موبايل لإدارة المعاملات المالية لشركة MENA Express. يعمل على iOS وAndroid وWeb.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Mobile**: Expo + Expo Router (file-based routing)
- **AI**: OpenRouter API (Gemini 2.0 Flash)
- **Build**: esbuild (CJS bundle)

## User Accounts

- **معتز الورفلي**: PIN = `MU@2025` (role: sender - يضيف ويعدل القيم)
- **سلوان عباس**: PIN = `SA@2025` (role: receiver - يستلم ويؤكد)
- **ريان عباس**: PIN = `RA@2025` (role: receiver - يستلم ويؤكد)
- **أنس جميل**: PIN = `AJ@2025` (role: receiver - يستلم ويؤكد)

## Features

- تسجيل دخول بالرمز السري (مع إظهار/إخفاء)
- معتز يضيف قيم لسلوان وريان وأنس تلقائياً
- **تعديل القيم المعلقة** (معتز فقط) مع إشعار للمستقبلين
- **تكملة قيمة موجودة** - إضافة مبلغ إضافي لقيمة معلقة
- **تأكيد الاستلام مع ملاحظة** - المستقبل يضيف ملاحظة عند التأكيد
- إشعارات فورية على الجهاز (expo-notifications مع صوت)
- تزامن تلقائي كل 15 ثانية
- **وضع داكن (Dark Mode)** - يتبع إعداد الجهاز تلقائياً
- **Mena AI Chat** - دردشة ذكاء اصطناعي مع رؤية الصور وسياق قاعدة البيانات
- سجل كامل للمعاملات مع بحث وفلترة
- تقرير مالي شامل مع رسوم بيانية

## Structure

```text
artifacts/
  api-server/      # Express API server
  mena-wallet/     # Expo mobile app
    app/
      index.tsx               # Login screen (dark mode)
      edit-transaction.tsx    # Edit pending transaction (NEW)
      add-transaction.tsx     # Add/supplement transaction
      (tabs)/
        _layout.tsx           # Tab bar (with AI tab)
        index.tsx             # Home screen
        transactions.tsx      # Transactions list
        notifications.tsx     # Notifications
        reports.tsx           # Financial reports
        ai.tsx                # Mena AI Chat (NEW)
      transaction/[id].tsx    # Transaction details + confirm with note
    context/
      AppContext.tsx           # Global state & API calls
      ThemeContext.tsx         # Dark/light mode hook (NEW)
    constants/
      colors.ts               # Light & dark theme colors
lib/
  db/             # Drizzle ORM schema + DB connection
```

## Database Tables

- `transactions` - المعاملات المالية (includes `confirmationNotes`)
- `notifications` - الإشعارات للمستخدمين

## API Endpoints

- `POST /api/auth/login` - تسجيل الدخول برمز PIN
- `GET /api/transactions` - قائمة المعاملات (مع فلترة)
- `POST /api/transactions` - إضافة معاملة جديدة
- `GET /api/transactions/:id` - تفاصيل معاملة
- `PATCH /api/transactions/:id` - تعديل معاملة معلقة (NEW)
- `POST /api/transactions/:id/confirm` - تأكيد الاستلام مع ملاحظة
- `DELETE /api/transactions/:id` - حذف معاملة
- `GET /api/notifications` - الإشعارات
- `POST /api/notifications/:id/read` - تحديد كمقروء
- `POST /api/notifications/read-all` - تحديد الكل كمقروء
- `GET /api/reports/financial` - التقرير المالي
- `POST /api/ai/chat` - Mena AI chat with DB context (NEW)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection URL
- `OPENROUTER_API_KEY` - مفتاح API للذكاء الاصطناعي (OpenRouter)

## Workflows

- **Start Backend**: PORT=8080 pnpm --filter @workspace/api-server run dev
- **artifacts/mena-wallet: expo**: Expo dev server
