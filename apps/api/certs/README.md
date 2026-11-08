# PostgreSQL CA

`supabase-ca.crt` is the public Supabase Root 2021 CA certificate, downloaded over HTTPS from:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

It is a public trust certificate, not a private key. Remote PostgreSQL connections verify both certificate trust and hostname. Do not replace verification with `rejectUnauthorized: false`.
