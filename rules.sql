CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  active boolean DEFAULT true,
  expiration_date timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.info_usuario (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  role text,
  active boolean DEFAULT true,
  workspace_id uuid REFERENCES public.workspaces(id),
  created_at timestamp with time zone DEFAULT now()
);


