
--crear un proyecto nuevo en supabase --
--crear un usuario con el correo super@app.com y contrase;a a convenir, asegurarse de que este marcado como "confirmado"


INSERT INTO public.profiles (id, nombre, email, telefono, rol, activo)
SELECT 
    'id', 
    'Kore Devs', 
    'super@app.com', 
    '42140797', 
    'super', 
    true
FROM auth.users 
WHERE email = 'super@app.com' --aqui poner el correo del usuario que se va a creo en auth.users
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