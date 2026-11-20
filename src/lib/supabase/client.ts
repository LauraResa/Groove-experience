"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Cliente de navegador (subida directa de fotos a Storage; RLS decide qué se permite) */
export const clienteNavegador = () => createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
