const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  try {
    const url = `${supabaseUrl}/rest/v1/`;
    console.log('Fetching schema from:', url);
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const schema = await res.json();
    console.log('Response keys:', Object.keys(schema));
    if (schema.paths) {
      console.log('Paths found:', Object.keys(schema.paths).filter(p => !p.includes('{')));
    }
    if (schema.components && schema.components.schemas) {
      console.log('Components schemas:', Object.keys(schema.components.schemas));
      console.log('Submissions component:', JSON.stringify(schema.components.schemas.submissions, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
