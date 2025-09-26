import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function loadEnvFromFiles() {
  const possibleFiles = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'frontend/.env'),
  ];

  for (const file of possibleFiles) {
    try {
      const raw = await fs.readFile(file, 'utf-8');
      parseEnv(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`No se pudo leer ${file}:`, error.message);
      }
    }
  }
}

function parseEnv(raw) {
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    if (!key || rest.length === 0) continue;
    const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function resolveEnv() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  return { supabaseUrl, serviceRoleKey };
}

function assertEnv({ supabaseUrl, serviceRoleKey }) {
  if (!supabaseUrl) {
    throw new Error(
      'No se encontró SUPABASE_URL. Define SUPABASE_URL o VITE_SUPABASE_URL en tu entorno o archivo .env.'
    );
  }

  if (!serviceRoleKey) {
    console.warn(
      '⚠️  No se encontró SUPABASE_SERVICE_ROLE_KEY. Se usará la clave pública, lo que puede fallar si tienes RLS.'
    );
  }
}

function createSupabaseClient({ supabaseUrl, serviceRoleKey }) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });
}

async function promptMenu(rl) {
  console.log('\n=== Gestor de base de datos ===');
  console.log('1) Registrar empresa');
  console.log('2) Registrar coordinador');
  console.log('3) Listar registros');
  console.log('4) Salir');

  const answer = await rl.question('Selecciona una opción: ');
  return answer.trim();
}

async function promptNonEmpty(rl, message, { optional = false } = {}) {
  while (true) {
    const value = (await rl.question(message)).trim();
    if (optional || value) {
      return value || null;
    }
    console.log('El valor no puede ser vacío. Intenta nuevamente.');
  }
}

async function registerEmpresa(supabase, rl) {
  console.log('\n--- Registrar empresa ---');
  const razon_social = await promptNonEmpty(rl, 'Razón social: ');
  const direccion = await promptNonEmpty(rl, 'Dirección: ');
  const jefe_directo = await promptNonEmpty(rl, 'Nombre del jefe directo: ');
  const cargo_jefe = await promptNonEmpty(rl, 'Cargo del jefe directo: ');
  const telefono = await promptNonEmpty(rl, 'Teléfono: ');
  const email = await promptNonEmpty(rl, 'Email: ');

  const { data, error } = await supabase
    .from('empresas')
    .insert({
      razon_social,
      direccion,
      jefe_directo,
      cargo_jefe,
      telefono,
      email,
    })
    .select()
    .single();

  if (error) {
    console.error('Error al registrar la empresa:', error.message);
  } else {
    console.log('✅ Empresa registrada correctamente.');
    console.log(data?.[0] ?? '');
  }
}

async function registerCoordinador(supabase, rl) {
  console.log('\n--- Registrar coordinador ---');
  const user_id = await promptNonEmpty(rl, 'ID de usuario (opcional): ', { optional: true });
  const nombre = await promptNonEmpty(rl, 'Nombre: ');
  const apellido = await promptNonEmpty(rl, 'Apellido: ');
  const email = await promptNonEmpty(rl, 'Email: ');
  const telefono = await promptNonEmpty(rl, 'Teléfono (opcional): ', { optional: true });
  const departamento = await promptNonEmpty(rl, 'Departamento (opcional): ', { optional: true });
  const domicilio = await promptNonEmpty(rl, 'Domicilio (opcional): ', { optional: true });

  const payload = {
    nombre,
    apellido,
    email,
    telefono,
    departamento,
    domicilio,
  };

  if (user_id) {
    payload.user_id = user_id;
  }

  const { data, error } = await supabase.from('coordinadores').insert(payload).select().single();

  if (error) {
    console.error('Error al registrar el coordinador:', error.message);
  } else {
    console.log('✅ Coordinador registrado correctamente.');
    console.log(data?.[0] ?? '');
  }
}

async function listRecords(supabase, rl) {
  console.log('\n--- Listar registros ---');
  const tables = {
    1: 'estudiantes',
    2: 'coordinadores',
    3: 'empresas',
    4: 'practicas',
  };

  for (const [key, table] of Object.entries(tables)) {
    console.log(`${key}) ${table}`);
  }

  const choice = await rl.question('Elige una tabla a listar: ');
  const table = tables[choice.trim()];

  if (!table) {
    console.log('Opción inválida.');
    return;
  }

  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });

  if (error) {
    console.error(`Error al listar ${table}:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`No se encontraron registros en ${table}.`);
    return;
  }

  console.table(data);
}

async function main() {
  await loadEnvFromFiles();
  const env = resolveEnv();
  assertEnv(env);

  const supabase = createSupabaseClient(env);
  const rl = readline.createInterface({ input, output });

  try {
    let exit = false;
    while (!exit) {
      const option = await promptMenu(rl);
      switch (option) {
        case '1':
          await registerEmpresa(supabase, rl);
          break;
        case '2':
          await registerCoordinador(supabase, rl);
          break;
        case '3':
          await listRecords(supabase, rl);
          break;
        case '4':
          exit = true;
          break;
        default:
          console.log('Opción no reconocida.');
      }
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error fatal:', error.message);
  process.exit(1);
});
