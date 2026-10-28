# PowerShell script to commit migration files
git add -f migrations/019_vera_query_response_bank.sql
git add -f migrations/020_vera_website_learning.sql
git add -f migrations/021_vera_user_profiles.sql
git add .gitignore
git commit -m "Fix: Add missing Vera migration files (019, 020, 021) and update .gitignore"
git push

