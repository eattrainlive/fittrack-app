import { build } from 'esbuild';
build({
  entryPoints: ['src/pages/Admin.tsx'],
  bundle: true,
  outfile: 'out.js',
  external: ['react', 'react-dom', 'lucide-react', 'sonner', 'framer-motion', 'recharts', '@hello-pangea/dnd', 'react-router-dom', '@supabase/supabase-js'],
  loader: { '.tsx': 'tsx' }
}).catch(() => process.exit(1));