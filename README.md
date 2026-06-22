# Gestión de gastos

App de finanzas personales hecha con **Next.js + Supabase**, lista para deploy en **Vercel**.

Maneja: ingresos (sueldo + manuales + cobros automáticos), gastos personales, gastos de casa (÷2 automático), tres tarjetas con gastos compartidos, balances por persona, estadísticas con gráfico y exportación a Excel.

---

## 1. Cargar la base de datos en Supabase

1. Entrá a tu proyecto de Supabase → **SQL Editor** → **New query**.
2. Pegá TODO el contenido de `supabase_schema.sql` y ejecutá (**Run**).
3. Esto crea las tablas, los triggers de sincronización y deja **2026 con junio a diciembre vacíos** y sus 3 tarjetas por mes.

> El esquema también incluye la función `create_year(p_year)` que la app usa cuando tocás "Agregar año" (crea los 12 meses + tarjetas).

## 2. Conectar el código a tu repo de GitHub

```bash
cd gestion-gastos
git init
git add .
git commit -m "Gestión de gastos - versión inicial"
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git branch -M main
git push -u origin main
```

## 3. Variables de entorno

### En tu máquina (local)
Copiá `.env.local.example` a `.env.local` y completá con tus valores
(Supabase → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-public-key
```

### En Vercel (deploy)
1. Vercel → tu proyecto → **Settings → Environment Variables**.
2. Agregá las dos variables de arriba con los mismos valores.
3. Marcá los tres entornos: **Production, Preview, Development**.
4. **Redeploy** (las variables solo se aplican en el próximo deploy).

## 4. Correr local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

---

## Cómo funciona la lógica clave

- **Gastos casa**: el "compartido" es siempre `monto total ÷ 2` (columna calculada en la base de datos).
- **Gastos de tarjeta compartidos**: el c/u es `monto total ÷ (vos + cantidad de personas)`. Por cada persona en "compartido con" se crea **automáticamente un ingreso** ligado a ese gasto.
- **Sincronización**: si editás el monto o las personas de un gasto compartido, los ingresos automáticos se recalculan solos. Si borrás el gasto, esos ingresos se borran solos. (No se editan por separado, justamente para que nunca se desincronicen.)
- **Balances por persona**: suma todos los cobros automáticos agrupados por nombre.
- **Exportar Excel**: genera un único archivo con **una hoja por cada mes** de todos los años cargados.

## Nota de seguridad

La app no tiene login (es de uso personal). Las políticas RLS permiten leer/escribir con la `anon key`, así que **no compartas la URL pública del deploy**. Si más adelante querés cerrarla, se puede agregar Supabase Auth.
