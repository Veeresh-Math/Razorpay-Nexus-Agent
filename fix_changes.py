import os
BASE = r'C:\Users\Veeresh Math\Desktop\Razorpay Nexus-Agent'

def fix_page_tsx():
    path = os.path.join(BASE, 'frontend', 'app', 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()
    # Fix 2a: Add ArrowDown to lucide-react import
    content = content.replace("  ArrowUpRight,\n} from 'lucide-react'", "  ArrowUpRight,\n  ArrowDown,\n} from 'lucide-react'")
    # Fix 1a: Add bgGradient to Track 01
    content = content.replace("    color: 'from-nexus-teal to-nexus-tealLight',\n  },", "    color: 'from-nexus-teal to-nexus-tealLight',\n    bgGradient: 'from-cyan-500 to-cyan-300',\n  },", 1)
    content = content.replace("    color: 'from-blue-500 to-blue-400',\n  },", "    color: 'from-blue-500 to-blue-400',\n    bgGradient: 'from-blue-500 to-blue-400',\n  },", 1)
    content = content.replace("    color: 'from-emerald-500 to-emerald-400',\n  },", "    color: 'from-emerald-500 to-emerald-400',\n    bgGradient: 'from-emerald-500 to-emerald-400',\n  },", 1)
    content = content.replace('<div className={p-3 rounded-xl bg-gradient-to-br  text-nexus-dark}>', '<div className={p-3 rounded-xl bg-gradient-to-br  text-nexus-dark}>')
    old_step = '<div className={p-2 rounded-lg bg-/20 text-}>' + chr(10) + '                        <step.icon className="w-5 h-5" />'
    new_step_lines = [
        '<div className={',
        "                      step.color === 'nexus-teal'",
        "                        ? 'p-2 rounded-lg bg-cyan-500/20 text-cyan-400'",
        "                        : step.color === 'blue-500'",
        "                        ? 'p-2 rounded-lg bg-blue-500/20 text-blue-400'",
        "                        : step.color === 'amber-500'",
        "                        ? 'p-2 rounded-lg bg-amber-500/20 text-amber-400'",
        "                        : 'p-2 rounded-lg bg-emerald-500/20 text-emerald-400'",
        '                    }>' + chr(10) + '                        <step.icon className="w-5 h-5" />'
    ]
    content = content.replace(old_step, chr(10).join(new_step_lines))
    arrowdown_block = chr(10).join([
        "// ArrowDown component (inline since lucide doesn't export it directly)",
        "function ArrowDown({ className }: { className?: string }) {",
        "  return (",
        '    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">',
        '      <path d="M12 5v14" />',
        '      <path d="m19 12-7 7-7-7" />',
        "    </svg>",
        "  );",
        "}",
        ""
    ])
    content = content.replace(arrowdown_block, '')
    with open(path, 'w') as f:
        f.write(content)
    print('page.tsx fixed')

def fix_merchant_dashboard():
    path = os.path.join(BASE, 'frontend', 'app', 'merchant-dashboard', 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()
    old_tab = "                className={lex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all }"
    new_tab_lines = [
        "                className={",
        "                  activeTab === tab.id",
        "                    ? 'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-nexus-teal text-nexus-dark shadow-lg'",
        "                    : 'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white'",
        "                }"
    ]
    content = content.replace(old_tab, chr(10).join(new_tab_lines))
    old_summary = '<div className={p-2 rounded-lg bg-/20 text-}>' + chr(10) + '        <Icon className="w-5 h-5" />'
    new_summary_lines = [
        '<div className={',
        "                      color === 'nexus-teal'",
        "                        ? 'p-2 rounded-lg bg-cyan-500/20 text-cyan-400'",
        "                        : color === 'blue-500'",
        "                        ? 'p-2 rounded-lg bg-blue-500/20 text-blue-400'",
        "                        : color === 'amber-500'",
        "                        ? 'p-2 rounded-lg bg-amber-500/20 text-amber-400'",
        "                        : 'p-2 rounded-lg bg-emerald-500/20 text-emerald-400'",
        '                    }>' + chr(10) + '        <Icon className="w-5 h-5" />'
    ]
    content = content.replace(old_summary, chr(10).join(new_summary_lines))
    with open(path, 'w') as f:
        f.write(content)
    print('merchant-dashboard/page.tsx fixed')

def fix_reconciliation():
    path = os.path.join(BASE, 'backend', 'app', 'api', 'v1', 'reconciliation.py')
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace('@router.post("/reconciliation/generate-test-batch")', '@router.post("/reconciliation/generate-test-batch", response_model=dict)')
    with open(path, 'w') as f:
        f.write(content)
    print('reconciliation.py fixed')

def fix_conftest():
    path = os.path.join(BASE, 'backend', 'tests', 'conftest.py')
    with open(path, 'r') as f:
        content = f.read()
    old_line = 'os.environ.setdefault("UPSTASH_REDIS_REST_URL", "http://localhost:6379")'
    new_line = 'os.environ.setdefault("UPSTASH_REDIS_REST_URL", "http://localhost:6379")  # Local test placeholder - replace with actual Upstash REST URL in production'
    content = content.replace(old_line, new_line)
    with open(path, 'w') as f:
        f.write(content)
    print('conftest.py fixed')

if __name__ == '__main__':
    fix_page_tsx()
    fix_merchant_dashboard()
    fix_reconciliation()
    fix_conftest()
    print('All fixes applied successfully.')