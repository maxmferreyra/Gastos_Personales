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

---

## Actualización v2 — Dólares, congelar conversión y login

### 1. Correr la migración en Supabase
SQL Editor → New query → pegá y ejecutá `supabase_migration_v2.sql`.
Es seguro sobre la base que ya tenés (no borra datos). Agrega:
- Soporte de moneda (ARS/USD) en gastos de tarjeta + conversión a pesos.
- Congelar conversiones por mes.
- Cierra el acceso: a partir de ahora **solo usuarios logueados** pueden ver/editar.

### 2. Crear tu usuario (obligatorio antes de probar)
1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Email: tu email. Password: la que elijas. Activá **Auto Confirm User**.
3. Supabase → **Authentication → Providers → Email** → desactivá
   **"Allow new users to sign up"** (deja cerrado el registro: solo existís vos).

> Importante: después de la migración, sin login no se ve nada. Si no creaste
> el usuario primero, no vas a poder entrar.

### 3. Cómo funciona el dólar
- Al cargar un gasto de tarjeta elegís **Pesos (ARS)** o **Dólares (USD)**.
- Si es USD, se muestra una columna extra con la conversión a pesos usando el
  **dólar tarjeta** de dolarapi.com (se actualiza solo).
- Botón **"Congelar conversiones del mes"**: fija el tipo de cambio actual para
  todos los gastos USD de ese mes (ideal cuando vas a pagar). Queda marcado con
  un copo de nieve ❄️. Podés **descongelar** cuando quieras.

No hace falta ninguna variable de entorno nueva: seguís con las dos de Supabase.

---

## Actualización v3 — Gastos fijos, cuotas automáticas y dólar oficial

No requiere cambios en la base de datos. Solo subí el código nuevo.

### Gastos fijos (personales y casa)
Al cargar un gasto nuevo aparece el checkbox **"Gasto fijo mensual"**. Si lo
marcás, ese concepto se replica con el mismo monto en todos los meses
siguientes hasta diciembre. No pisa meses donde ese concepto ya exista (solo
rellena). Después editás cada mes a mano si el valor cambia.

### Cuotas automáticas
Si cargás un gasto (personal o de tarjeta) con cuota total mayor a la actual
(ej. 1/12), se crean solas las cuotas restantes en los meses siguientes
(2/12, 3/12... 12/12) con el mismo monto. Si la serie cruza diciembre, **se
crea el año siguiente automáticamente** con sus meses y tarjetas.

### Dólar oficial
La conversión de gastos en USD ahora usa el **dólar oficial** (antes era
tarjeta). Los gastos ya cargados/congelados no se modifican.

---

## Actualización v4 — % compartido, gastos de otras personas y ajustes

### 1. Correr la migración en Supabase
SQL Editor → New query → pegá y ejecutá `supabase_migration_v4.sql`.
Agrega el campo de porcentaje, actualiza el trigger de ingresos y renombra
la tarjeta "Galicia titular" → "Galicia Maxi adicional". Seguro sobre tus datos.

### 2. Gastos compartidos con porcentaje
En un gasto de tarjeta, al agregar personas en "Compartido con" aparece el
campo **"% que asumen ellos"** (botones 33/50/66/100 o valor libre):
- Es el % del gasto que te devuelven entre todas las personas (repartido igual).
- Ejemplos: Chino 100% = te devuelve todo (la entrada que pusiste vos pero es de él);
  Chino 50% = mitad y mitad; Guille+Pampo 66% = 33% cada uno.
- El gasto **siempre suma completo al total de la tarjeta** (vos lo pagás).
- El ingreso automático es el % que asumen ellos.
- **Tu gasto real del mes** es solo la parte que NO te devuelven. Si es 100% de
  otra persona, no te suma nada como gasto propio.

> Los gastos compartidos que ya tenías quedan en 50% (como funcionaban). Si
> alguno era de otra proporción, editalo y ajustá el %.
