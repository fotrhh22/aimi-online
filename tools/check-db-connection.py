"""Read-only PostgreSQL connectivity check; never print connection credentials."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
import os
import re
import subprocess

root = Path(__file__).resolve().parents[1]
values = {}
for line in (root / 'apps/api/.env.local').read_text().splitlines():
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('\"\'')

url = urlsplit(values['DATABASE_URL'])
env = os.environ.copy()
env.update(
    PGHOST=url.hostname, PGPORT=str(url.port or 5432),
    PGUSER=unquote(url.username or ''),
    PGPASSWORD=unquote(url.password or ''),
    PGDATABASE=unquote(url.path.lstrip('/')), PGSSLMODE='require',
    PGCONNECT_TIMEOUT='12', PGOPTIONS='-c default_transaction_read_only=on',
    PSQL_HISTORY='/dev/null', LC_ALL='C',
)
query = (
    "SELECT 'connection_ok'; "
    "SELECT 'public_tables=' || count(*)::text FROM information_schema.tables "
    "WHERE table_schema='public' AND table_type='BASE TABLE';"
)
try:
    result = subprocess.run(
        ['psql', '-X', '-w', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', '\\conninfo', '-c', query],
        env=env, capture_output=True, text=True, timeout=25,
    )
except subprocess.TimeoutExpired:
    print('Connection failed: timeout')
    raise SystemExit(1)
if result.returncode == 0:
    print('connection_ok' if 'connection_ok' in result.stdout else 'query_unconfirmed')
    print('client_tls=' + str(bool(re.search(r'SSL connection|SSL/TLS|TLSv[0-9]', result.stdout))))
    count = re.search(r'public_tables=([0-9]+)', result.stdout)
    if count:
        print('public_tables=' + count.group(1))
else:
    error = result.stderr.lower()
    labels = {
        'could not translate host name': 'DNS resolution failed',
        'operation not permitted': 'Network access blocked',
        'password authentication failed': 'Database password authentication failed',
        'tenant or user not found': 'Pooler tenant/user not found',
        'timeout': 'Connection timeout',
        'certificate': 'TLS certificate error',
        'connection refused': 'Connection refused',
    }
    print('Connection failed: ' + next(
        (label for phrase, label in labels.items() if phrase in error),
        'Unclassified error; sensitive response suppressed',
    ))
    raise SystemExit(1)
