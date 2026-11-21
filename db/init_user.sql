
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  nombre text,
  dpi text,
  genero text,
  fecha_nacimiento date,
  direccion text,
  telefono text,
  nit text,
  contacto_emergencia text,
  rol text,
  avatar_url text,
  activo bool default true,
  created_at timestamptz default now(),
  email text,
  telefono_emergencia text
);


alter table profiles enable row level security;

create policy "Acceso total para usuarios autenticados"
on profiles
for all
to authenticated
using (true)
with check (true);





INSERT INTO public.profiles (id, nombre, email, telefono, rol, activo)
SELECT 
    '6fd31511-afc4-4a4b-8061-a7ec350f6c39', --aqui pegue el id del usuario que se encuentra en auth.users con email
    'FarmaMuni Admin', 
    'admin@farmamuni.com', 
    '42140797', 
    'super', 
    true
FROM auth.users 
WHERE email = 'admin@app.com'
ON CONFLICT (id) DO UPDATE 
SET 
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    telefono = EXCLUDED.telefono,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

---crear iconos para la app---

--- para ello sustituimos el icono de la carpeta public por el que se encuentra en src/assets/icon.png ---
--- luego ejecutamos el siguiente comando para generar los iconos a partir de esa imagen ---

pnpm dlx @vite-pwa/assets-generator --preset minimal-2023 public/icon.png



--- consultar secuencias en postgres ---

SELECT relname 
FROM pg_class 
WHERE relkind = 'S';

--  Reiniciar el contador de recibos a 1
ALTER SEQUENCE ven_ventas_numero_recibo_seq RESTART WITH 1;