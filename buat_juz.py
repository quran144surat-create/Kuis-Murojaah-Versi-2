# Membuat juz-1.html ... juz-30.html dari juz-template.html
from pathlib import Path
t = Path('juz-template.html').read_text(encoding='utf-8')
for j in range(1, 31):
    Path(f'juz-{j}.html').write_text(t.replace('{{JUZ}}', str(j)), encoding='utf-8')
print('30 file juz-N.html dibuat')
