"""Insert assignment entries into a set file, keeping the whole array sorted by cardNumber.
Each 'entry' = optional leading // comment lines + the object literal block."""
import re

def _split_entries(body):
    lines = body.split('\n')
    entries, cur, depth = [], [], 0
    for ln in lines:
        if not cur and ln.strip() == '':
            continue
        cur.append(ln)
        code = ln.split('//')[0]
        depth += code.count('{') - code.count('}')
        if depth == 0 and any('{' in x.split('//')[0] for x in cur):
            entries.append('\n'.join(cur).rstrip())
            cur = []
    if any(x.strip() for x in cur):
        entries.append('\n'.join(cur).rstrip())
    return entries

def _cardnum(entry):
    m = re.search(r"cardNumber:\s*'([^']+)'", entry)
    return m.group(1) if m else '~~~'

def insert_sorted(path, new_entries):
    s = open(path).read()
    apos = s.index('_ASSIGNMENTS')
    hm = re.search(r'=\s*\[', s[apos:])
    start = apos + hm.end()
    end = s.rindex('\n];')
    header, body, footer = s[:start], s[start:end], s[end:]
    entries = _split_entries(body) + [e.rstrip() for e in new_entries]
    entries = [e for e in entries if _cardnum(e) != '~~~']
    # de-dup by cardNumber (last wins) is NOT desired; assume no dups. sort stable by cardNumber.
    entries.sort(key=_cardnum)
    out = header + '\n\n' + '\n\n'.join('  ' + e.lstrip() if not e.startswith('  ') else e for e in entries) + '\n' + footer
    open(path, 'w').write(out)
    return len(entries)
