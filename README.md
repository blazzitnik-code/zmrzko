# ZMRZK❄️ - Freezer Inventory App

Aplikacija za upravljanje zamrzovalnika s cloud sinhronizacijo.

## Deploy navodila

### 1. Supabase (že narejeno)
- ✅ Projekt ustvarjen
- ✅ SQL schema zagnana

### 2. GitHub Repository
1. Pojdi na https://github.com/new
2. Repository name: `zmrzko`
3. Pusti **Public** ali izberi **Private**
4. **NE** obkljukaj "Add a README" (mi ga imamo)
5. Klikni **Create repository**
6. Na svojem računalniku odpri terminal in zaženi:

```bash
# Kloniraj ta projekt (ali kopiraj datoteke)
cd zmrzko
git init
git add .
git commit -m "Initial commit - ZMRZKO app"
git branch -M main
git remote add origin https://github.com/TVOJ-USERNAME/zmrzko.git
git push -u origin main
```

### 3. Vercel Deploy
1. Pojdi na https://vercel.com/new
2. Klikni **Import** pri tvojem `zmrzko` repozitoriju
3. **POMEMBNO** - dodaj Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = tvoj Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tvoj anon key
4. Klikni **Deploy**
5. Počakaj ~1-2 min
6. Dobiš URL kot `zmrzko.vercel.app`!

### 4. PWA - Dodaj na telefon
- **iPhone**: Odpri URL v Safari → Share → Add to Home Screen
- **Android**: Odpri URL v Chrome → ⋮ meni → Add to Home screen

## Lokalni razvoj

```bash
npm install
npm run dev
```

Odpri http://localhost:3000
