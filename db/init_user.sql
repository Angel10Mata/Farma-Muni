
INSERT INTO public.profiles (id, nombre, email, telefono, rol, activo)
SELECT 
    'id', 
    'Kore Devs', 
    'kore@gmail.com', 
    '42140797', 
    'super', 
    true
FROM auth.users 
WHERE email = 'kore@app.com'
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